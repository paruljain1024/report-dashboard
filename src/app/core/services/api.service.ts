import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  baseUrl = 'http://localhost:5596';

  constructor(private http: HttpClient) {}

  // ✅ FIXED: return JSON (not text)
  startProcessing(){
    return this.http.get<any>(`${this.baseUrl}/process/run`);
  }

  checkLogs(){
    return this.http.get<any>(`${this.baseUrl}/process/check`);
  }

  getProcessingStatus(){
    return this.http.get<any>(`${this.baseUrl}/process/status`);
  }

  getSummary(){
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/summary`);
  }

  getTypes(){
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/types`);
  }

  getResponseCodes(){
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/response-codes`);
  }

  getPerformance(){
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/performance`);
  }

  getProcessingTime(){
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/processing-time`);
  }

  getActiveSize(){
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/active-size`);
  }

  getTransactionTime(){
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/transaction-time`);
  }

  getCustomGraph(metric:string, date:string, from:string, to:string, interval:number){
    return this.http.get<any[]>(
      `${this.baseUrl}/api/filter/custom?metric=${metric}&date=${date}&from=${from}&to=${to}&interval=${interval}`
    );
  }

  getMetricGraph(metric:string){
    return this.http.get<any[]>(`${this.baseUrl}/api/filter/custom?metric=${metric}`);
  }

  downloadFormatted(){
    return this.http.get(`${this.baseUrl}/api/excel/download-formatted`, {
      responseType: 'blob'
    });
  }

  getTypewiseTimeSeries() {
    return this.http.get(`${this.baseUrl}/api/chart/typewise-timeseries`);
  }
}