import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector:'app-excel',
  standalone:true,
  imports:[CommonModule,FormsModule],
  templateUrl:'./excel.html',
  styleUrl:'./excel.css'
})
export class ExcelComponent {

  currentUser: string = '';
  selectedAnalytics = '';
  tableTitle='';

  tableData:any[]=[];
  columns:string[]=[];

  loading=false;
  summaryData:any[]=[];
  performanceData:any[]=[];
  processingData:any[]=[];
  activeData:any[]=[];
  transactionData:any[]=[];
  uniqueData:any[]=[];

  constructor(
    private api: ApiService,
    private state: AppStateService
  ){}

  private getJobId() {
    const jobId = this.state.getJobId();

    if (!jobId) {
      alert('Process logs first');
    }

    return jobId;
  }

  loadAnalytics(){
  const jobId = this.getJobId();

  if (!jobId) {
    this.loading = false;
    return;
  }

  this.loading = true;

  switch(this.selectedAnalytics){

    /* ================= SUMMARY ================= */
  case 'summary':
    this.tableTitle = 'Request Summary';

  const user =
    localStorage.getItem('currentUser') || '';

  this.currentUser = user;

  if(this.summaryData.length){
    this.processSummaryData(this.summaryData);
    this.loading=false;
    return;
  }

  this.api.getTypes(jobId).subscribe((d:any[])=>{
    this.summaryData=d;
    this.processSummaryData(d);
    this.loading=false;
  });
  

  break;


    /* ================= PERFORMANCE ================= */
    case 'performance':
      this.tableTitle = 'Transaction Time Summary';

      if(this.performanceData.length){
        this.columns=['type','min','avg','max']; // metric removed ✅
        this.tableData=this.performanceData;
        this.loading=false;
        return;
      }

      this.api.getPerformance(jobId).subscribe((d:any[])=>{
        this.performanceData=d;
        this.columns=['type','min','avg','max'];
        this.tableData=d;
        this.loading=false;
      });
      
    break;


    /* ================= PROCESSING ================= */
    case 'processing':
this.tableTitle = 'Processing Time Analysis in ms';
this.api.getProcessingTime(jobId).subscribe((data:any[])=>{

  const rangesSet = new Set<string>();

  // collect all ranges
  data.forEach(t=>{
    t.ranges.forEach((r:any)=>{
      rangesSet.add(r.range);
    });
  });

  const ranges = Array.from(rangesSet);

  // column headers
  this.columns = ['type', ...ranges];

  this.tableData = data.map(item=>{

    const row:any = { type:item.type };

    ranges.forEach(r=>{
      const found =
        item.ranges.find((x:any)=>x.range===r);

      row[r] = found ? found.count : 0;
    });

    return row;
  });

  this.loading=false;
});
break;


    /* ================= ACTIVE ================= */
    case 'active':
      this.tableTitle = 'Active Size Analysis';

  this.api.getActiveSize(jobId).subscribe((d:any)=>{

  this.columns=['min','avg','max'];

  this.tableData=[d];   // ✅ convert object → array

  this.loading=false;
  });
  break;


    /* ================= TRANSACTION ================= */
    case 'transaction':
    this.tableTitle = 'PreTUPS Transaction Time (PPT)';

  this.api.getTransactionTime(jobId).subscribe((d:any)=>{

  this.columns=['maximum','average'];

  this.tableData=[d];

  this.loading=false;
  });
  break;
//unique-response


  case 'response':
    this.tableTitle = 'Error Code Summary';

  this.api.getResponseCodes(jobId).subscribe((d:any)=>{

  this.columns=['response','count'];

  this.tableData =
    Object.keys(d).map(key=>({
      response:key,
      count:d[key]
    }));

  this.loading=false;
  });
  break;
  }
  }
  downloadExcel() {

  if (!this.tableData.length) {
    alert("No data to download");
    return;
  }

  const worksheet =
    XLSX.utils.json_to_sheet(this.tableData);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Analytics'
  );

  const excelBuffer =
    XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

  const blob = new Blob(
    [excelBuffer],
    {
      type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  );

  saveAs(blob, 'analytics-report.xlsx');
}
formatValue(value:any){
  return !isNaN(value)
    ? Number(value).toFixed(2)
    : value;
}


processSummaryData(data:any[]){

  const isComviva =
    this.currentUser === 'comviva';

  if(isComviva){

    // Show actual column
    this.columns = [
      'type',
      'requestsFired',
      'received',
      'success',
      'failed'
    ];

    this.tableData = data.map(row=>({
      ...row,
      requestsFired: row.requestsFired,
      failed: row.received - row.success
    }));

  } else {

    // Duplicate received → requestFired
    this.columns = [
      'type',
      'requestFired',
      'received',
      'success',
      'failed'
    ];

    this.tableData = data.map(row=>({
      type: row.type,
      requestFired: row.received,
      received: row.received,
      success: row.success,
      failed: row.received - row.success
    }));
  }
}

getColumnName(col:string){

  if(col === 'requestsFired')
    return 'Actual Request Fired';

  if(col === 'requestFired')
    return 'Request Fired';

  if(col === 'failed')
  return 'Failed';

  return col.charAt(0).toUpperCase() + col.slice(1);
}

downloadFullReport(){

 const jobId = this.getJobId();

 if (!jobId) {
   return;
 }

 this.api.downloadFormatted(jobId).subscribe(blob => {

   const file = new Blob([blob], {
     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

  const link = document.createElement('a');
    link.href = window.URL.createObjectURL(file);
    link.download = 'Formatted_Report.xlsx';
   link.click();

   });
}
}
