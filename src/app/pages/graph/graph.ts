import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Document, ImageRun, Packer, Paragraph } from 'docx';
import * as echarts from 'echarts';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graph.html',
  styleUrl: './graph.css'
})
export class GraphComponent {
  allMetrics = [
    'request-in',
    'request-out',
    'active-size',
    'rtt',
    'val',
    'ppt',
    'top',
    'efficiency',
  ];

  downloadType = '';
  metric = '';
  date = '';
  fromTime = '';
  toTime = '';
  interval = 1;

  loading = false;
  charts: Record<string, echarts.ECharts> = {};
  typewiseKeys: string[] = [];
  private pendingRequests = 0;

  constructor(
    private api: ApiService,
    private state: AppStateService
  ) {}

  private getJobId() {
    const jobId = this.state.getJobId();

    if (!jobId) {
      alert('Process logs first');
    }

    return jobId;
  }

  formatTime(time: string) {
    if (!time) {
      return '';
    }

    return time.length === 5 ? `${time}:00` : time;
  }

  loadCustomGraph() {
    this.clearAllCharts();
    const jobId = this.getJobId();

    if (!jobId) {
      return;
    }

    if (!this.metric) {
      alert('Select metric');
      return;
    }

    this.loading = true;

    if (this.metric === 'typewise-timeseries') {
      const request$ = this.date
        ? this.api.getCustomGraph(
            jobId,
            this.metric,
            this.date,
            this.formatTime(this.fromTime),
            this.formatTime(this.toTime),
            this.interval
          )
        : this.api.getTypewiseTimeSeries(jobId);

      request$.subscribe((data: any) => {
        this.renderTypewiseCharts(data);
        this.loading = false;
      });

      return;
    }

    if (this.metric === 'all') {
      this.loadAllGraphs();
      return;
    }

    this.loadSingleMetric(jobId, this.metric);
  }

  loadAllGraphs() {
    const jobId = this.getJobId();

    if (!jobId) {
      return;
    }

    this.pendingRequests = this.allMetrics.length;

    this.allMetrics.forEach((metric) => {
      this.loadSingleMetric(jobId, metric);
    });
  }

  loadSingleMetric(jobId: string, metricName: string) {
    const request$ = this.date
      ? this.api.getCustomGraph(
          jobId,
          metricName,
          this.date,
          this.formatTime(this.fromTime),
          this.formatTime(this.toTime),
          this.interval
        )
      : this.api.getMetricGraph(jobId, metricName);

    request$.subscribe((data: any) => {
      const chartId = this.metric === 'all' ? `chart-${metricName}` : 'chart';
      const chartDom = document.getElementById(chartId);

      if (!chartDom) {
        this.finishRequest();
        return;
      }

      this.charts[metricName]?.dispose();
      this.charts[metricName] = echarts.init(chartDom);

      if (metricName === 'efficiency') {
        this.renderEfficiencyChart(this.charts[metricName], data);
        this.finishRequest();
        return;
      }

      if (['val', 'ppt', 'rtt', 'top'].includes(metricName)) {
        this.renderMinAvgMaxChart(this.charts[metricName], metricName, data);
        this.finishRequest();
        return;
      }

      this.renderStandardChart(this.charts[metricName], metricName, data);
      this.finishRequest();
    });
  }

  async downloadGraph() {
    if (!this.downloadType) {
      alert('Select download format');
      return;
    }

    const charts = this.collectChartElements();

    if (!charts.length) {
      alert('Generate graph first');
      return;
    }

    const images: string[] = [];

    for (const element of charts) {
      const canvas = await html2canvas(element, { scale: 2 });
      images.push(canvas.toDataURL('image/png'));
    }

    if (this.downloadType === 'png') {
      await this.downloadPng(charts);
      return;
    }

    if (this.downloadType === 'pdf') {
      const pdf = new jsPDF('landscape');
      let y = 10;

      images.forEach((image, index) => {
        pdf.addImage(image, 'PNG', 10, y, 270, 80);
        y += 90;

        if ((index + 1) % 2 === 0 && index !== images.length - 1) {
          pdf.addPage();
          y = 10;
        }
      });

      pdf.save('Analytics_Report.pdf');
      return;
    }

    if (this.downloadType === 'docx') {
      const children: Paragraph[] = [
        new Paragraph({
          text: 'Comviva Log Analytics Report',
          heading: 'Heading1'
        })
      ];

      for (const image of images) {
        const response = await fetch(image);
        const buffer = await response.arrayBuffer();

        children.push(new Paragraph(' '));
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: buffer,
                type: 'png',
                transformation: {
                  width: 600,
                  height: 300
                }
              })
            ]
          })
        );
      }

      const doc = new Document({
        sections: [{ children }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'Analytics_Report.docx');
    }
  }

  clearAllCharts() {
    Object.values(this.charts).forEach((chart) => chart.dispose());
    this.charts = {};
    this.typewiseKeys = [];
    this.pendingRequests = 0;

    const container = document.getElementById('chartsContainer');
    if (container) {
      container.innerHTML = '';
    }

    const mainChart = document.getElementById('chart');
    if (mainChart) {
      mainChart.innerHTML = '';
    }

    this.allMetrics.forEach((metric) => {
      const element = document.getElementById(`chart-${metric}`);
      if (element) {
        element.innerHTML = '';
      }
    });
  }

  clearForm() {
    this.metric = '';
    this.date = '';
    this.fromTime = '';
    this.toTime = '';
    this.interval = 1;
    this.downloadType = '';
    this.loading = false;
    this.clearAllCharts();
  }

  renderTypewiseCharts(data: any) {
    const requestIn = data?.requestIn ?? {};
    const requestOut = data?.requestOut ?? {};

    this.typewiseKeys = Object.keys(requestIn);

    const container = document.getElementById('chartsContainer');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    this.typewiseKeys.forEach((type) => {
      const chartId = `chart-${type}`;
      const outer = document.createElement('div');
      outer.className = 'chart-wrapper';

      const wrapper = document.createElement('div');
      wrapper.className = 'chart-box';

      const chartDom = document.createElement('div');
      chartDom.id = chartId;
      chartDom.style.height = '470px';

      wrapper.appendChild(chartDom);
      outer.appendChild(wrapper);
      container.appendChild(outer);

      const chart = echarts.init(chartDom);
      this.charts[type] = chart;

      const times = Object.keys(requestIn[type] ?? {}).sort();

      chart.setOption({
        title: {
          text: `${type} Analysis`,
          left: 'center'
        },
        tooltip: { trigger: 'axis' },
        legend: {
          top: 30,
          data: ['Request In', 'Request Out']
        },
        xAxis: {
          type: 'category',
          name: 'Time',
          nameLocation: 'middle',
          nameGap: 35,
          data: times
        },
        yAxis: {
          type: 'value',
          name: 'Requests'
        },
        dataZoom: [
          { type: 'inside' },
          { type: 'slider' }
        ],
        series: [
          {
            name: 'Request In',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: times.map((time) => requestIn[type]?.[time] || 0),
            lineStyle: {
              color: '#fb98c1',
              width: 3,
            }
          },
          {
            name: 'Request Out',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: times.map((time) => requestOut[type]?.[time] || 0),
            lineStyle: {
              color: '#88d3fc',
              width: 3
            }
          }
        ]
      });
    });
  }

  private collectChartElements() {
    const chartElements: HTMLElement[] = [];

    if (this.metric === 'all') {
      this.allMetrics.forEach((metric) => {
        const element = document.getElementById(`chart-${metric}`);
        if (element) {
          chartElements.push(element);
        }
      });

      return chartElements;
    }

    if (this.metric === 'typewise-timeseries') {
      this.typewiseKeys.forEach((type) => {
        const element = document.getElementById(`chart-${type}`);
        if (element) {
          chartElements.push(element);
        }
      });

      return chartElements;
    }

    const element = document.getElementById('chart');
    if (element) {
      chartElements.push(element);
    }

    return chartElements;
  }

  private async downloadPng(charts: HTMLElement[]) {
    if (this.metric !== 'all' && this.metric !== 'typewise-timeseries') {
      const canvas = await html2canvas(charts[0], { scale: 2 });
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, 'Graph.png');
        }
      });

      return;
    }

    const zip = new JSZip();
    const names = this.metric === 'typewise-timeseries' ? this.typewiseKeys : this.allMetrics;

    for (const [index, chart] of charts.entries()) {
      const canvas = await html2canvas(chart, { scale: 2 });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));

      if (blob) {
        zip.file(`${names[index]}.png`, blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'Analytics_Graphs.zip');
  }

  private finishRequest() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    this.loading = this.metric === 'all' ? this.pendingRequests > 0 : false;
  }

  private renderEfficiencyChart(chart: echarts.ECharts, data: any) {
    const times = Array.from(
      new Set([
        ...Object.keys(data.success || {}),
        ...Object.keys(data.failure || {})
      ])
    ).sort();

    chart.setOption({
      title: {
        text: 'Efficiency Analysis',
        left: 'center'
      },
      tooltip: { trigger: 'axis' },
      legend: {
        top: 30,
        data: ['Success', 'Failure']
      },
      xAxis: {
        type: 'category',
        name: 'Time',
        nameLocation: 'middle',
        nameGap: 35,
        data: times
      },
      yAxis: {
        type: 'value',
        name: 'Requests'
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider' }
      ],
      series: [
        {
          name: 'Success',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: times.map((time) => data.success?.[time] || 0),
          lineStyle: { color: '#f790b0', width: 2 }
        },
        {
          name: 'Failure',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: times.map((time) => data.failure?.[time] || 0),
          lineStyle: { color: '#db1111', width: 2 }
        }
      ]
    });
  }

  private renderMinAvgMaxChart(chart: echarts.ECharts, metricName: string, data: any) {
    const times = Object.keys(data);

    chart.setOption({
      title: {
        text: `${metricName.toUpperCase()} Analysis`,
        left: 'center'
      },
      tooltip: { trigger: 'axis' },
      legend: {
        top: 30,
        data: ['Min', 'Avg', 'Max']
      },
      xAxis: {
        type: 'category',
        name: 'Time',
        nameLocation: 'middle',
        nameGap: 35,
        data: times
      },
      yAxis: {
        type: 'value',
        name: 'Processing Time (ms)'
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider' }
      ],
      series: [
        {
          name: 'Min',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: times.map((time) => data[time].min),
          lineStyle: { color: '#f5d487' }
        },
        {
          name: 'Avg',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: times.map((time) => data[time].avg),
          lineStyle: { color: '#80caed' }
        },
        {
          name: 'Max',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: times.map((time) => data[time].max),
          lineStyle: { color: '#ee89bd' }
        }
      ]
    });
  }

  private renderStandardChart(chart: echarts.ECharts, metricName: string, data: any) {
    const times = Object.keys(data);

    chart.setOption({
      title: {
        text: metricName === 'request-out'
          ? 'REQUEST OUT & TPS Analysis'
          : `${metricName.toUpperCase()} Analysis`,
        left: 'center'
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        name: 'Time',
        nameLocation: 'middle',
        nameGap: 35,
        data: times
      },
      yAxis: {
        type: 'value',
        name: 'Requests Per Second'
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider' }
      ],
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: times.map((time) => data[time]),
          lineStyle: { color: '#6ecdf0' }
        }
      ]
    });
  }
}
