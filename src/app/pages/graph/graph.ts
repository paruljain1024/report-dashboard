import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import * as echarts from 'echarts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

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
  styleUrl: './graph.css'
})
export class GraphComponent {

  /* ===============================
        ALL METRICS LIST
  ===============================*/
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
  charts: { [key: string]: any } = {};
  typewiseKeys: string[] = [];

  constructor(private api: ApiService) {}

  /* ===============================
        FORMAT TIME
  ===============================*/
  formatTime(t: string) {
    if (!t) return '';
    return t.length === 5 ? t + ':00' : t;
  }

  /* ===============================
        MAIN BUTTON CLICK
  ===============================*/
  loadCustomGraph() {


    this.clearAllCharts();

    // ===== TYPEWISE TIMESERIES =====
  // ===== TYPEWISE TIMESERIES =====
if (this.metric === 'typewise-timeseries') {

  this.clearAllCharts();

  let request$;

  // ✅ SAME LOGIC AS OTHER METRICS
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

  request$.subscribe((data:any) => {
    this.renderTypewiseCharts(data);
  });
  return;
}

    if (!this.metric) {
      alert('Select metric');
      return;
    }

    this.loading = true;

    /* ===== ALL DASHBOARD ===== */
    if (this.metric === 'all') {
      this.loadAllGraphs();
      return;
    }

    /* ===== SINGLE GRAPH ===== */
    this.loadSingleMetric(this.metric);
  }

  /* ===============================
        LOAD ALL METRICS
  ===============================*/
  loadAllGraphs() {

    this.allMetrics.forEach(metric => {
      this.loadSingleMetric(metric);
    });

    this.loading = false;
  }

  /* ===============================
        LOAD SINGLE METRIC
  ===============================*/
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

      const chartDom =
        document.getElementById(chartId);

      if (!chartDom) return;

      if(this.charts[metricName]){
        this.charts[metricName].dispose();
      }

      this.charts[metricName] = echarts.init(chartDom);
      const chart = this.charts[metricName];

      /* =====================================================
            EFFICIENCY GRAPH
      =====================================================*/
      if (metricName === 'efficiency') {

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
              data: times.map(t => data.success[t]||0),
              lineStyle: { color: '#f790b0', width: 2 }
            },
            {
              name: 'Failure',
              type: 'line',
              smooth: true,
              showSymbol: false,
              data: times.map(t => data.failure[t]||0),
              lineStyle: { color: '#db1111', width: 2 }
            }
          ]
        });

        return;
      }

      /* =====================================================
            MIN / AVG / MAX METRICS
      =====================================================*/
      if (['val', 'ppt', 'rtt', 'top']
        .includes(metricName)) {

        const times = Object.keys(data);

        chart.setOption({

          title: {
            text: metricName.toUpperCase() + ' Analysis',
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
              data: times.map(t => data[t].min),
              lineStyle: { color: '#f5d487' }
            },
            {
              name: 'Avg',
              type: 'line',
              smooth: true,
              showSymbol: false,
              data: times.map(t => data[t].avg),
              lineStyle: { color: '#80caed' }
            },
            {
              name: 'Max',
              type: 'line',
              smooth: true,
              showSymbol: false,
              data: times.map(t => data[t].max),
              lineStyle: { color: '#ee89bd' }
            }
          ]
        });

        return;
      }

      /* =====================================================
            NORMAL METRICS
      =====================================================*/
      const times = Object.keys(data);

      chart.setOption({

        title: {
           text: metricName === 'request-out'
           ? 'REQUEST OUT & TPS Analysis'
          : metricName.toUpperCase() + ' Analysis',
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
            data: times.map(t => data[t]),
            lineStyle: { color: '#6ecdf0' }
          }
        ]
      });

      this.loading = false;
    });
  }
  
  async downloadGraph() {

  if(!this.downloadType){
    alert("Select download format");
    return;
  }

  /* ===============================
        COLLECT ALL CHARTS
  ===============================*/

  const charts:HTMLElement[] = [];

if(this.metric !== 'all' && this.metric !== 'typewise-timeseries'){
    this.allMetrics.forEach(m=>{
    const el = document.getElementById('chart-'+m);
    if(el) charts.push(el);
  });

}
else if(this.metric === 'typewise-timeseries'){

  // ⭐ FIX: collect all typewise charts
  Object.keys(this.charts).forEach(type=>{
    const el = document.getElementById('chart-'+type);
    if(el) charts.push(el);
  });

}
else{

  const el = document.getElementById('chart');
  if(el) charts.push(el);
}
  if(charts.length===0){
    alert("Generate graph first");
    return;
  }

  /* ===============================
        CAPTURE IMAGES
  ===============================*/

  const images:string[]=[];

  for(const el of charts){

    const canvas =
      await html2canvas(el,{
        scale:2
      });

    images.push(
      canvas.toDataURL('image/png')
    );
  }
  /* ================= PNG DOWNLOAD ================= */

if(this.downloadType === 'png'){

  /* ---------- SINGLE GRAPH ---------- */

  if(this.metric !== 'all' && this.metric !== 'typewise-timeseries'){

    const canvas =
      await html2canvas(charts[0]);

    canvas.toBlob(blob=>{
      if(blob)
        saveAs(blob,'Graph.png');
    });

    return;
  }

  /* ---------- ALL → ZIP ---------- */

  const zip = new JSZip();

  for(let i=0;i<charts.length;i++){

    const canvas =
      await html2canvas(charts[i],{
        scale:2
      });

    const blob =
      await new Promise<Blob|null>(
        resolve=>canvas.toBlob(resolve)
      );

    if(blob){
      let name = '';

    if(this.metric === 'typewise-timeseries'){
      name = this.typewiseKeys[i];   // ✅ TYPEWISE NAME
      }else{
      name = this.allMetrics[i];     // ✅ ALL NAME
    }

    zip.file(`${name}.png`, blob);
    }
  }

  const zipBlob =
    await zip.generateAsync({
      type:'blob'
    });

  saveAs(
    zipBlob,
    'Analytics_Graphs.zip'
  );

  return;
}

  /* ====================================================
                ✅ PDF EXPORT
     2 GRAPHS PER PAGE
  ====================================================*/

  if(this.downloadType==='pdf'){

    const pdf =
      new jsPDF('landscape');

    let y = 10;

    images.forEach((img,i)=>{

      pdf.addImage(
        img,
        'PNG',
        10,
        y,
        270,
        80
      );

      y += 90;

      /* new page after 2 graphs */
      if((i+1)%2===0 && i!==images.length-1){
        pdf.addPage();
        y = 10;
      }
    });

    pdf.save("Analytics_Report.pdf");
    return;
  }

  /* ====================================================
                ✅ DOCX EXPORT
     2 GRAPHS PER PAGE
  ====================================================*/

  if(this.downloadType==='docx'){

    const children:any[]=[];

    children.push(
      new Paragraph({
        text:"Comviva Log Analytics Report",
        heading:"Heading1"
      })
    );

    for(const img of images){

      const res =
        await fetch(img);

      const buffer =
        await res.arrayBuffer();

      children.push(
        new Paragraph(" ")
      );

      children.push(
        new Paragraph({
          children:[
            new ImageRun({
              data:buffer,
              type:"png",
              transformation:{
                width:600,
                height:300
              }
            })
          ]
        })
      );
    }

    const doc =
      new Document({
        sections:[
          { children }
        ]
      });

    const blob =
      await Packer.toBlob(doc);

    saveAs(blob,
      "Analytics_Report.docx");
  }
}
clearAllCharts(){

  Object.keys(this.charts).forEach(key=>{
    if(this.charts[key]){
      this.charts[key].dispose();
    }
    const container = document.getElementById('chartsContainer');
    if (container) container.innerHTML = '';
  });

  this.charts = {};

  const mainChart =
    document.getElementById('chart');

  if(mainChart){
    mainChart.innerHTML = '';
  }

  this.allMetrics.forEach(m=>{
    const el =
      document.getElementById('chart-'+m);
    if(el){
      el.innerHTML='';
    }
  });
}
clearForm(){

  this.metric = '';
  this.date = '';
  this.fromTime = '';
  this.toTime = '';
  this.interval = 1;
  this.downloadType = '';

  this.loading = false;

  this.clearAllCharts();   // remove generated graphs
}


renderTypewiseCharts(data: any) {


  this.typewiseKeys = Object.keys(data.requestIn);

  const container = document.getElementById('chartsContainer');
  if(!container)return;

  container.innerHTML = '';

  const requestIn = data.requestIn;
  const requestOut = data.requestOut;

  Object.keys(requestIn).forEach(type => {

    const chartId = 'chart-' + type;

    // create div dynamically
    let chartDom = document.getElementById(chartId);

    if (!chartDom) {
      //const container = document.getElementById('chartsContainer');

      const outer = document.createElement('div');
      outer.className = 'chart-wrapper';


      const wrapper = document.createElement('div');
      wrapper.className = 'chart-box';   // ⭐ CHANGE ONLY THIS

      const div = document.createElement('div');
      div.id = chartId;
     // div.className = 'typewise-chart';      // ⭐ ADD THIS
      div.style.height = '470px';

      wrapper.appendChild(div);
      outer.appendChild(wrapper);
      container?.appendChild(outer);

      chartDom = div;
    }

    if (this.charts[type]) {
      this.charts[type].dispose();
    }

    setTimeout(() => {

  this.charts[type] = echarts.init(chartDom!);

  const chart = this.charts[type];

  const times = Object.keys(requestIn[type])
  //.map(t => t.substring(0,8))
  .sort();

  
  chart.setOption({
    title: {
      text: type + ' Analysis',
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
        data: times.map(t => requestIn[type][t] || 0),
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
        data: times.map(t => requestOut[type]?.[t] || 0),
        lineStyle: {
          color: '#88d3fc',
          width: 3
        }
      }
    ]
  });

}, 200);

  });
}
}
