import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ExcelComponent } from './excel';

describe('Excel', () => {
  let component: ExcelComponent;
  let fixture: ComponentFixture<ExcelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcelComponent],
      providers: [provideHttpClient()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExcelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
