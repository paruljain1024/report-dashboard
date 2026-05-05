import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderComponent } from '../header/header';
import { GlobalPopupComponent } from '../../../global-popup.component';
import { OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
  RouterOutlet,
  SidebarComponent,
  HeaderComponent,
  GlobalPopupComponent   // 🔥 MUST ADD
],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayoutComponent implements OnInit {

  constructor(
    private api: ApiService,
    private state: AppStateService
  ){}

  ngOnInit(){

    // 🔥 Sync with backend on reload
    this.api.getProcessingStatus().subscribe((res:any) => {

      if(res.status === 'COMPLETED'){
        this.state.setHasData(true);
        this.state.setCompleted(true);
        return;
      }

      // 🔥 IMPORTANT: allow access even during processing IF data exists
      if(res.status === 'PROCESSING'){
        this.state.setHasData(true);   // 👈 KEY FIX
        return;
      }

      this.state.setHasData(false);
      this.state.setCompleted(false);
    });

  }
}