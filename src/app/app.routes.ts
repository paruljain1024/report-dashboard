import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout';
import { ProcessingComponent } from './pages/processing/processing';
import { ExcelComponent } from './pages/excel/excel';
import { GraphComponent } from './pages/graph/graph';
import { completedGuard } from './core/services/guards/completed.guard';

export const routes: Routes = [

{
  path:'',
  component: MainLayoutComponent,
  children:[

    {
      path:'processing',
      loadComponent:()=>import('./pages/processing/processing')
      .then(m=>m.ProcessingComponent)
    },

    {
      path:'excel',
      canActivate: [completedGuard],
      loadComponent:()=>import('./pages/excel/excel')
      .then(m=>m.ExcelComponent)
    },

    {
      path:'graph',
      canActivate: [completedGuard],
      loadComponent:() =>
      import('./pages/graph/graph')
      .then(m=>m.GraphComponent)
},

    {
      path:'',
      redirectTo:'processing',
      pathMatch:'full'
    }

  ]
}

];