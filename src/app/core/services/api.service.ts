import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ❌ REMOVED jobId param (IMPORTANT FIX)
  checkLogs() {
    return this.http.get<any>(`${this.baseUrl}/process/check`);
  }
  
  startProcessing() {
  return this.http.get<{ started: boolean; jobId: string; message: string }>(
    `${this.baseUrl}/process/run`
  );
}

  getProcessingStatus(jobId: string) {
    return this.http.get<any>(`${this.baseUrl}/process/status`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  // (keep rest same)

  getSummary(jobId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/summary`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  getTypes(jobId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/types`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  getResponseCodes(jobId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/response-codes`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  getPerformance(jobId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/performance`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  getProcessingTime(jobId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/processing-time`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  getActiveSize(jobId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/active-size`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  getTransactionTime(jobId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/api/excel/transaction-time`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }

  getCustomGraph(
    jobId: string,
    metric: string,
    date: string,
    from: string,
    to: string,
    interval: number
  ) {
    let params = new HttpParams()
      .set('jobId', jobId)
      .set('metric', metric)
      .set('interval', interval);

    if (date) params = params.set('date', date);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<any[]>(`${this.baseUrl}/api/filter/custom`, { params });
  }

  getMetricGraph(jobId: string, metric: string) {
    const params = new HttpParams()
      .set('jobId', jobId)
      .set('metric', metric);

    return this.http.get<any[]>(`${this.baseUrl}/api/filter/custom`, { params });
  }

  downloadFormatted(jobId: string) {
    return this.http.get(
      `${this.baseUrl}/api/excel/download-formatted`,
      {
        params: new HttpParams().set('jobId', jobId),
        responseType: 'blob'
      }
    );
  }

  getTypewiseTimeSeries(jobId: string) {
    return this.http.get(`${this.baseUrl}/api/chart/typewise-timeseries`, {
      params: new HttpParams().set('jobId', jobId)
    });
  }
}