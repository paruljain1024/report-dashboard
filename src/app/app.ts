import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AppStateService } from './core/services/app-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  private readonly processingRoute = '/processing';

  constructor(
    private router: Router,
    private state: AppStateService
  ) {}

  ngOnInit() {
    this.disableBackNavigation();
    this.redirectRefreshToProcessing();
  }

  private disableBackNavigation() {
    history.pushState(null, '', location.href);

    window.onpopstate = () => {
      history.pushState(null, '', location.href);
    };
  }

  private redirectRefreshToProcessing() {
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const isReload = navigationEntries.some((entry) => entry.type === 'reload');

    if (!isReload) {
      return;
    }

    this.resetAfterRefresh();
  }

  private resetAfterRefresh() {
    this.state.clearProcessingState();
    localStorage.removeItem('currentUser');

    if (this.router.url !== this.processingRoute) {
      void this.router.navigate([this.processingRoute]);
    }
  }
}
