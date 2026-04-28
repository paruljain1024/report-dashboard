import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {

  completed = false;

  constructor(
    private state: AppStateService,
    private api: ApiService
  ) {
    this.state.processingCompleted$
      .subscribe(v => this.completed = v);

    this.checkBackendStatus();
  }

  checkBackendStatus() {
    const jobId = this.state.getJobId();

    if (!jobId) {
      return;
    }

    this.api.getProcessingStatus(jobId)
      .subscribe((res: any) => {
        if (res.status === 'COMPLETED') {
          this.completed = true;
          this.state.setCompleted(true);
        }
      });
  }

  getRoute(path: string) {
    return this.completed || path === '/processing' ? path : null;
  }
}
