import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector:'app-sidebar',
  standalone:true,
  imports:[
    CommonModule,
    RouterModule   // ⭐ REQUIRED
  ],
  templateUrl:'./sidebar.html',
  styleUrl:'./sidebar.css'
})
export class SidebarComponent {

  completed = false;

  constructor(
  private state: AppStateService,
  private api: ApiService
){

  // listen to global updates
  this.state.processingCompleted$
    .subscribe(v => this.completed = v);

  // ⭐ restore state from backend
  this.checkBackendStatus();
}
checkBackendStatus(){

  this.api.getProcessingStatus()
  .subscribe((res:any) => {

    if(res.status === 'COMPLETED'){
      this.completed = true;
      this.state.setCompleted(true);
      return;
    }

    this.completed = false;
    this.state.setCompleted(false);

  });
}
getRoute(path: string){
  return path;
}
}
