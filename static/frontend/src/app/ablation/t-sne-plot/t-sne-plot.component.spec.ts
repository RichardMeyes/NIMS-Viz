import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TSNEPlotComponent } from './t-sne-plot.component';

describe('TSNEPlotComponent', () => {
  let component: TSNEPlotComponent;
  let fixture: ComponentFixture<TSNEPlotComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TSNEPlotComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TSNEPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
