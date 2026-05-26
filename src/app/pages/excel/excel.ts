import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { ChangeDetectorRef, OnInit } from '@angular/core';

import { Router } from '@angular/router';

@Component({
  selector:'app-excel',
  standalone:true,
  imports:[CommonModule,FormsModule],
  templateUrl:'./excel.html',
  styleUrl:'./excel.css'
})
export class ExcelComponent implements OnInit {

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
  private api:ApiService,
  private state: AppStateService,
  private cd: ChangeDetectorRef,
  private router: Router
){}

  onAnalyticsChange(value: string){
    this.selectedAnalytics = value;
    this.loadAnalytics();
  }

  loadAnalytics(){

    this.loading = true;

    switch(this.selectedAnalytics){

      /* ================= SUMMARY ================= */

      case 'summary':

        this.tableTitle = 'Request Summary';

        // 🔥 FIXED USER RESTORE
        this.currentUser =
          this.state.getUser() || '';

        if(this.summaryData.length){

          this.processSummaryData(
            this.summaryData
          );

          this.loading=false;
          this.cd.detectChanges();

          return;
        }

        this.api.getTypes().subscribe((d:any[])=>{

          this.summaryData=d;

          this.processSummaryData(d);

          this.loading=false;
          this.cd.detectChanges();
        });

      break;

      /* ================= PERFORMANCE ================= */

      case 'performance':

        this.tableTitle =
          'Transaction Time Summary';

        if(this.performanceData.length){

          this.columns=[
            'type',
            'min',
            'avg',
            'max'
          ];

          this.tableData =
            this.performanceData;

          this.loading=false;
          this.cd.detectChanges();

          return;
        }

        this.api.getPerformance()
        .subscribe((d:any[])=>{

          this.performanceData=d;

          this.columns=[
            'type',
            'min',
            'avg',
            'max'
          ];

          this.tableData=d;

          this.loading=false;
          this.cd.detectChanges();
        });

      break;

      /* ================= PROCESSING ================= */

      case 'processing':

        this.tableTitle =
          'Processing Time Analysis in ms';

        this.api.getProcessingTime()
        .subscribe((data:any[])=>{

          const rangesSet =
            new Set<string>();

          data.forEach(t=>{

            t.ranges.forEach((r:any)=>{

              rangesSet.add(r.range);
            });
          });

          const ranges =
            Array.from(rangesSet);

          this.columns = [
            'type',
            ...ranges
          ];

          this.tableData =
            data.map(item=>{

            const row:any = {
              type:item.type
            };

            ranges.forEach(r=>{

              const found =
                item.ranges.find(
                  (x:any)=>x.range===r
                );

              row[r] =
                found ? found.count : 0;
            });

            return row;
          });

          this.loading=false;
          this.cd.detectChanges();
        });

      break;

      /* ================= ACTIVE ================= */

      case 'active':

        this.tableTitle =
          'Active Size Analysis';

        this.api.getActiveSize()
        .subscribe((d:any)=>{

          this.columns=[
            'min',
            'avg',
            'max'
          ];

          this.tableData=[
            this.normalizeActiveSizeRow(d)
          ];

          this.loading=false;
          this.cd.detectChanges();
        });

      break;

      /* ================= TRANSACTION ================= */

      case 'transaction':

        this.tableTitle =
          'PreTUPS Transaction Time (PPT)';

        this.api.getTransactionTime()
        .subscribe((d:any)=>{

          this.columns=[
            'maximum',
            'average'
          ];

          this.tableData=[d];

          this.loading=false;
          this.cd.detectChanges();
        });

      break;

      /* ================= RESPONSE ================= */

      case 'response':

        this.tableTitle =
          'Error Code Summary';

        this.api.getResponseCodes()
        .subscribe((d:any)=>{

          this.columns=[
            'response',
            'count'
          ];

          this.tableData =
          Object.keys(d)
          .filter(key =>
          key !== '200' &&
          key !== 'SUCCESS'
        )
        .map(key => ({

         response: key,
         count: d[key]
        })); 
          this.loading=false;
          this.cd.detectChanges();
        });

      break;
    }
  }

  // =====================================================
  // DOWNLOAD EXCEL
  // =====================================================

  downloadExcel() {

    if (!this.tableData.length) {

      alert("No data to download");

      return;
    }

    let exportData = this.tableData;

    if (this.selectedAnalytics === 'response') {

      exportData = this.tableData.filter(
      row =>
      row.response !== '200' &&
      row.response !== 'SUCCESS'
     );
    }

    const worksheet =
    XLSX.utils.json_to_sheet(
    exportData
    );

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

  // =====================================================
  // FORMAT VALUE
  // =====================================================

  formatValue(value:any){

    return !isNaN(value)
      ? Number(value).toFixed(2)
      : value;
  }

  private normalizeActiveSizeRow(data: any) {

    return {
      min: Number(data?.min ?? data?.minimum ?? 0),
      avg: Number(data?.avg ?? data?.average ?? 0),
      max: Number(data?.max ?? data?.maximum ?? 0)
    };
  }

  // =====================================================
  // SUMMARY PROCESSING
  // =====================================================

  processSummaryData(data:any[]){

    // 🔥 FIXED COMVIVA LOGIC
    const isComviva =
      this.state.getUser()
      ?.toLowerCase() === 'comviva';

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

        requestsFired:
          row.requestsFired,

        failed:
          row.received - row.success
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

        requestFired:
          row.received,

        received:
          row.received,

        success:
          row.success,

        failed:
          row.received - row.success
      }));
    }
  }

  // =====================================================
  // COLUMN NAME
  // =====================================================

  getColumnName(col:string){

    if(col === 'requestsFired')
      return 'Actual Request Fired';

    if(col === 'requestFired')
      return 'Request Fired';

    if(col === 'failed')
      return 'Failed';

    return col.charAt(0).toUpperCase()
      + col.slice(1);
  }

  // =====================================================
  // DOWNLOAD FULL REPORT
  // =====================================================

  downloadFullReport(){

  const user =
    this.state.getUser() || '';

  this.api.downloadFormatted(user)
  .subscribe(blob => {

    const file = new Blob(
      [blob],
      {
        type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    );

    const link =
      document.createElement('a');

    link.href =
      window.URL.createObjectURL(file);

    link.download =
      'Formatted_Report.xlsx';

    link.click();
  });
 }

 ngOnInit(): void {

this.api.getTypes()
.subscribe({

  next: (data:any[]) => {

    if(!data || data.length === 0){

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
