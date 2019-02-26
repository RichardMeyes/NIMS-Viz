import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AccuracyPlotComponent } from './accuracy-plot.component';

describe('AccuracyPlotComponent', () => {
  let component: AccuracyPlotComponent;
  let fixture: ComponentFixture<AccuracyPlotComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AccuracyPlotComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccuracyPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
