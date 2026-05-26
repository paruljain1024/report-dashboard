import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

import * as echarts from 'echarts';

import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

import jsPDF from 'jspdf';

import { Router } from '@angular/router';


import {
  Document,
  Packer,
  Paragraph,
  ImageRun
} from 'docx';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graph.html',
  styleUrl: './graph.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class GraphComponent implements OnInit {

  allMetrics = [
    'request-in',
    'request-out',
    'active-size',
    'rtt',
    'val',
    'ppt',
    'top',
    'efficiency'
  ];

  dynamicCharts: any[] = [];

  metric = '';
  date = '';
  fromTime = '';
  toTime = '';
  interval = 1;


  isDownloading = false;
  downloadType = '';

  loading = false;

  charts: { [key: string]: any } = {};

  typewiseKeys: string[] = [];
  pendingRequests = 0;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  trackByValue(_: number, value: string) {
    return value;
  }

  trackByChartId(_: number, chart: { id: string }) {
    return chart.id;
  }

  formatTime(t: string) {

    if (!t) return '';

    return t.length === 5 ? t + ':00' : t;
  }

  loadCustomGraph() {

    this.clearAllCharts();

    /* ================= TYPEWISE ================= */

    if (this.metric === 'typewise-timeseries') {

      let request$;

      if (this.date) {

        request$ = this.api.getCustomGraph(
          this.metric,
          this.date,
          this.formatTime(this.fromTime),
          this.formatTime(this.toTime),
          this.interval
        );

      } else {

        request$ = this.api.getTypewiseTimeSeries();
      }

      request$.subscribe((data: any) => {

        this.renderTypewiseCharts(data);
        this.loading = false;
        this.cdr.detectChanges();

      });

      return;
    }

    if (!this.metric) {

      alert('Select metric');
      return;
    }

    this.loading = true;

    /* ================= ALL ================= */

    if (this.metric === 'all') {

      this.loadAllGraphs();
      return;
    }

    /* ================= SINGLE ================= */

    this.loadSingleMetric(this.metric);
  }

  loadAllGraphs() {

    this.pendingRequests = this.allMetrics.length;

    this.allMetrics.forEach(metric => {

      this.loadSingleMetric(metric);
    });
  }

  loadSingleMetric(metricName: string) {

    let request$;

    if (this.date) {

      request$ = this.api.getCustomGraph(
        metricName,
        this.date,
        this.formatTime(this.fromTime),
        this.formatTime(this.toTime),
        this.interval
      );

    } else {

      request$ = this.api.getMetricGraph(metricName);
    }

    request$.subscribe((data: any) => {

      const chartId =
        this.metric === 'all'
          ? 'chart-' + metricName
          : 'chart';

      this.cdr.detectChanges();

      requestAnimationFrame(() => {

        const chartDom =
          document.getElementById(chartId);

        if (!chartDom) {
          this.finishRequest();
          return;
        }

        if (this.charts[metricName]) {
          this.charts[metricName].dispose();
        }

        this.charts[metricName] =
          echarts.init(chartDom, undefined, {
            useDirtyRect: true
          });

        const chart =
          this.charts[metricName];

        /* ================= EFFICIENCY ================= */

        if (metricName === 'efficiency') {

          const times = Array.from(
            new Set([
              ...Object.keys(data.success || {}),
              ...Object.keys(data.failure || {})
            ])
          ).sort();

          chart.setOption({

            animation: false,

            title: {
              text: 'Efficiency Analysis',
              left: 'center'
            },

            tooltip: {
              trigger: 'axis'
            },

            legend: {
              top: 30,
              data: ['Success', 'Failure']
            },

            xAxis: {
              type: 'category',
              data: times,
              name: 'Time',
              nameLocation: 'middle',
              nameGap: 35
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
              this.createLineSeries(
                'Success',
                times.map(t => data.success[t] || 0),
                '#f790b0'
              ),
              this.createLineSeries(
                'Failure',
                times.map(t => data.failure[t] || 0),
                '#dc2626'
              )
            ]
          });

          chart.resize();
          this.finishRequest();

          return;
        }

        /* ================= MIN AVG MAX ================= */

        if (['val', 'ppt', 'rtt', 'top'].includes(metricName)) {

          const times = Object.keys(data);

          chart.setOption({

            animation: false,

            title: {
              text: metricName.toUpperCase() + ' Analysis',
              left: 'center'
            },

            tooltip: {
              trigger: 'axis'
            },

            legend: {
              top: 30,
              data: ['Min', 'Avg', 'Max']
            },

            xAxis: {
              type: 'category',
              data: times,
              name: 'Time',
              nameLocation: 'middle',
              nameGap: 35
            },

            yAxis: {
              type: 'value',
              name: 'Processing Time'
            },

            dataZoom: [
              { type: 'inside' },
              { type: 'slider' }
            ],

            series: [
              this.createLineSeries(
                'Min',
                times.map(t => data[t].min),
                '#f5d487'
              ),
              this.createLineSeries(
                'Avg',
                times.map(t => data[t].avg),
                '#80caed'
              ),
              this.createLineSeries(
                'Max',
                times.map(t => data[t].max),
                '#ee89bd'
              )
            ]
          });

          chart.resize();
          this.finishRequest();

          return;
        }

        if (
          metricName === 'active-size' &&
          this.hasMinAvgMaxShape(data)
        ) {

          const normalized =
            this.normalizeMinAvgMaxSeries(data);

          chart.setOption({

            animation: false,

            title: {
              text: 'ACTIVE SIZE Analysis',
              left: 'center'
            },

            tooltip: {
              trigger: 'axis'
            },

            legend: {
              top: 30,
              data: ['Min', 'Avg', 'Max']
            },

            xAxis: {
              type: 'category',
              data: normalized.times,
              name: 'Time',
              nameLocation: 'middle',
              nameGap: 35
            },

            yAxis: {
              type: 'value',
              name: 'Size'
            },

            dataZoom: [
              { type: 'inside' },
              { type: 'slider' }
            ],

            series: [
              this.createLineSeries(
                'Min',
                normalized.min,
                '#f5d487'
              ),
              this.createLineSeries(
                'Avg',
                normalized.avg,
                '#80caed'
              ),
              this.createLineSeries(
                'Max',
                normalized.max,
                '#ee89bd'
              )
            ]
          });

          chart.resize();
          this.finishRequest();

          return;
        }

        /* ================= NORMAL ================= */

let times: string[] = [];
let values: number[] = [];

/* ===== ARRAY FORMAT ===== */

if (Array.isArray(data)) {
  times = data.map((d: any) => {

    const datePart = d.date || '';
    const timePart = d.time || '';

    return `${datePart} ${timePart}`.trim();
  });

  values = data.map((d: any) => {
    return this.extractMetricValue(d, metricName);
  });
}

/* ===== OBJECT FORMAT ===== */

else {

  const rawTimes = Object.keys(data);

  times = rawTimes.map((t: string) => {

    const timestamp = Number(t);

    if (!isNaN(timestamp)) {

      const dateObj = new Date(timestamp * 1000);

      return dateObj.toLocaleDateString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }) + ' ' +

      dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    return t;
  });

  values = rawTimes.map(
    (t: string) => Number(data[t]) || 0
  );
}

chart.setOption({

  animation: false,

  title: {
    text:
      metricName === 'request-out'
        ? 'REQUEST OUT & TPS Analysis'
        : metricName.toUpperCase() + ' Analysis',

    left: 'center'
  },

  tooltip: {
    trigger: 'axis'
  },

  xAxis: {
    type: 'category',
    data: times,
    name: 'Time',
    nameLocation: 'middle',
    nameGap: 35
  },

  yAxis: {
    type: 'value',
    name:
      metricName === 'active-size'
        ? 'Size'
        : 'Requests'
  },

  dataZoom: [
    { type: 'inside' },
    { type: 'slider' }
  ],

  series: [
    this.createLineSeries(
      metricName.toUpperCase(),
      values,
      '#f790b0'
    )
  ]
});

chart.resize();
this.finishRequest();

      });

      if (this.metric !== 'all') {
        this.loading = false;
      }
    });
  }

  /* ================= TYPEWISE ================= */

  renderTypewiseCharts(data: any) {

    this.typewiseKeys =
      Object.keys(data.requestIn);

    const requestIn = data.requestIn;
    const requestOut = data.requestOut;

    this.dynamicCharts = [];

    Object.keys(requestIn).forEach(type => {

      const chartId =
        'dynamic-chart-' + type;

      const rawTimes =
        Object.keys(requestIn[type] || {});

        const times = rawTimes.map((t: string) => {

        const timestamp = Number(t);

        if (!isNaN(timestamp)) {

          const dateObj = new Date(timestamp * 1000);

          return dateObj.toLocaleDateString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }) + ' ' +

          dateObj.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
  
        return t;
      });

      this.dynamicCharts.push({

        type: type,

        id: chartId,

        option: {

          animation: false,

          title: {
            text: type + ' Analysis',
            left: 'center'
          },

          tooltip: {
            trigger: 'axis'
          },

          legend: {
            top: 30,
            data: ['Request In', 'Request Out']
          },

          xAxis: {
            type: 'category',
            data: times,
            name: 'Time',
            nameLocation: 'middle',
            nameGap: 35
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
            this.createLineSeries(
              'Request In',
              rawTimes.map(
                t => requestIn[type][t] || 0
              ),
              '#a4e6f5'
            ),
            this.createLineSeries(
              'Request Out',
              rawTimes.map(
                 t => requestOut[type]?.[t] || 0
              ),
              '#f092b9'
            )
          ]
        }
      });
    });

    this.cdr.detectChanges();

    requestAnimationFrame(() => {

      setTimeout(() => {

        this.dynamicCharts.forEach(chart => {

          const chartDom =
            document.getElementById(chart.id);

          if (!chartDom) return;

          chartDom.style.width = '100%';
          chartDom.style.height = '400px';

          const myChart =
            echarts.init(chartDom, undefined, {
              useDirtyRect: true
            });

          myChart.setOption(chart.option);

          myChart.resize();

          this.charts[chart.id] = myChart;

        });

      }, 100);

    });
  }

  /* ================= DOWNLOAD ================= */

  async downloadGraph() {

    this.isDownloading = true;

try{

    if (!this.downloadType) {

      alert('Select download format');

      return;
    }

    const charts: HTMLElement[] = [];

    /* ---------- ALL ---------- */

    if (this.metric === 'all') {

      this.allMetrics.forEach(m => {

        const el =
          document.getElementById('chart-' + m);

        if (el) charts.push(el as HTMLElement);
      });
    }

    /* ---------- TYPEWISE ---------- */

    else if (this.metric === 'typewise-timeseries') {

      this.dynamicCharts.forEach(chart => {

        const el =
          document.getElementById(chart.id);

        if (el) charts.push(el as HTMLElement);
      });
    }

    /* ---------- SINGLE ---------- */

    else {

      const el =
        document.getElementById('chart');

      if (el) charts.push(el as HTMLElement);
    }

    if (charts.length === 0) {

      alert('Generate graph first');

      return;
    }

    /* ---------- PNG ---------- */

    if (this.downloadType === 'png') {

      if (
        this.metric !== 'all' &&
        this.metric !== 'typewise-timeseries'
      ) {

        const canvas =
          await html2canvas(charts[0]);

        canvas.toBlob(blob => {

          if (blob) {
            saveAs(blob, 'Graph.png');
          }

        });
        return;
      }

      const zip = new JSZip();

      for (let i = 0; i < charts.length; i++) {

        const canvas =
          await html2canvas(charts[i], {
            scale: 2
          });

        const blob =
          await new Promise<Blob | null>(
            resolve => canvas.toBlob(resolve)
          );

        if (blob) {

          let name = '';

          if (
            this.metric ===
            'typewise-timeseries'
          ) {

            name = this.typewiseKeys[i];

          } else {

            name = this.allMetrics[i];
          }

          zip.file(`${name}.png`, blob);
        }
      }

      const zipBlob =
        await zip.generateAsync({
          type: 'blob'
        });

      saveAs(zipBlob, 'Analytics_Graphs.zip');
    }

    /* ---------- PDF ---------- */

if (this.downloadType === 'pdf') {

  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let i = 0; i < charts.length; i++) {

    const canvas = await html2canvas(charts[i], {
      scale: 2
    });

    const imgData = canvas.toDataURL('image/png');

    const imgWidth = 190;

    const imgHeight =
      canvas.height * imgWidth / canvas.width;

    if (i > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      imgData,
      'PNG',
      10,
      10,
      imgWidth,
      imgHeight
    );
  }

  pdf.save('Analytics_Graphs.pdf');
  return;
}

/* ---------- DOCX ---------- */

if (this.downloadType === 'docx') {

  const children: any[] = [];

  for (const el of charts) {

    const canvas = await html2canvas(el, {
      scale: 2
    });

    const blob = await new Promise<Blob | null>(
      resolve => canvas.toBlob(resolve)
    );

    if (!blob) continue;

    const buffer = await blob.arrayBuffer();

    children.push(

      new Paragraph({

        children: [

          new ImageRun({

            data: buffer,

            type: 'png',
  
            transformation: {
              width: 600,
              height: 350
            }

          })

        ]

      })

    );
  }

  const doc = new Document({

    sections: [

      {
        properties: {},
        children
      }

    ]

  });

  const blob = await Packer.toBlob(doc);

  saveAs(blob, 'Analytics_Graphs.docx');
  return;
}


    
  }
  
  catch(error) {

    console.error(error);

    alert('Download failed');
  }


   finally {

    this.isDownloading = false;
    this.cdr.detectChanges();

  }
  }


  
  /* ================= CLEAR ================= */
  clearAllCharts() {

    Object.keys(this.charts).forEach(key => {

      if (this.charts[key]) {

        this.charts[key].dispose();
      }
    });

    this.dynamicCharts = [];

    this.charts = {};

    const mainChart =
      document.getElementById('chart');

    if (mainChart) {

      mainChart.innerHTML = '';
    }

    this.allMetrics.forEach(m => {

      const el =
        document.getElementById('chart-' + m);

      if (el) {

        el.innerHTML = '';
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
    this.pendingRequests = 0;

    this.clearAllCharts();
  }

  private finishRequest() {

    if (this.metric !== 'all') {
      this.loading = false;
      return;
    }

    this.pendingRequests =
      Math.max(0, this.pendingRequests - 1);

    this.loading = this.pendingRequests > 0;
  }

  private hasMinAvgMaxShape(data: any): boolean {

    if (Array.isArray(data)) {
      return data.some(row =>
        this.isMinAvgMaxRecord(row)
      );
    }

    if (data && typeof data === 'object') {
      return Object.values(data).some(row =>
        this.isMinAvgMaxRecord(row)
      );
    }

    return false;
  }

  private isMinAvgMaxRecord(row: any): boolean {
    return !!row &&
      typeof row === 'object' &&
      ['min', 'avg', 'max', 'minimum', 'average', 'maximum']
        .some(key => row[key] !== undefined && row[key] !== null);
  }

  private normalizeMinAvgMaxSeries(data: any) {

    const rows = Array.isArray(data)
      ? data
      : Object.entries(data ?? {}).map(([time, value]) => ({
          time,
          ...(value as object)
        }));

    return rows.reduce(
      (acc, row: any) => {
        acc.times.push(this.formatChartTime(row));
        acc.min.push(Number(row.min ?? row.minimum ?? 0));
        acc.avg.push(Number(row.avg ?? row.average ?? 0));
        acc.max.push(Number(row.max ?? row.maximum ?? 0));
        return acc;
      },
      {
        times: [] as string[],
        min: [] as number[],
        avg: [] as number[],
        max: [] as number[]
      }
    );
  }

  private formatChartTime(row: any): string {

    if (row?.date || row?.time) {
      return `${row?.date ?? ''} ${row?.time ?? ''}`.trim();
    }

    if (row?.timestamp !== undefined && row?.timestamp !== null) {
      return this.formatTimestampLabel(String(row.timestamp));
    }

    if (row?.time !== undefined && row?.time !== null) {
      return this.formatTimestampLabel(String(row.time));
    }

    return this.formatTimestampLabel(String(row ?? ''));
  }

  private formatTimestampLabel(rawValue: string): string {

    const timestamp = Number(rawValue);

    if (!Number.isNaN(timestamp)) {

      const dateObj = new Date(timestamp * 1000);

      return dateObj.toLocaleDateString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }) + ' ' +
      dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    return rawValue;
  }

  private createLineSeries(
    name: string,
    values: number[],
    color: string
  ) {
    return {
      name,
      type: 'line',
      smooth: false,
      showSymbol: false,
      symbol: 'circle',
      sampling: 'lttb',
      progressive: 500,
      progressiveThreshold: 3000,
      data: values,
      areaStyle: {
        opacity: 0.15,
        color: '#d1d5db',
      },
      lineStyle: {
        width: 2,
        color
      },
      itemStyle: {
        color
      }
    };
  }

  private extractMetricValue(
    row: any,
    metricName: string
  ): number {

    const candidates =
      metricName === 'active-size'
        ? [
            'avg',
            'average',
            'value',
            'activeSize',
            'active_size',
            'size',
            'max',
            'maximum',
            'min',
            'minimum'
          ]
        : ['value', metricName, 'count', 'size'];

    for (const key of candidates) {

      if (row?.[key] === undefined || row?.[key] === null) {
        continue;
      }

      const value = Number(row[key]);

      if (!Number.isNaN(value)) {
        return value;
      }
    }

    for (const [key, rawValue] of Object.entries(row ?? {})) {

      if (['date', 'time'].includes(key)) {
        continue;
      }

      const value = Number(rawValue);

      if (!Number.isNaN(value)) {
        return value;
      }
    }

    return 0;
  }

  ngOnInit() {

  this.api.getMetricGraph('request-in')
  .subscribe({

    next: (data:any) => {

      if (
        !data ||
        Object.keys(data).length === 0
      ) {

        alert(
          'Data not available. Please process logs first.'
        );

        this.router.navigate(['/processing']);
      }
    },

    error: () => {

      alert(
        'Backend data not available. Please process logs first.'
      );

      this.router.navigate(['/processing']);
    }

  });
}
}
