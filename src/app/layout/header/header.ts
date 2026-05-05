import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';  // ✅ IMPORTANT

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule], 
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {

}
