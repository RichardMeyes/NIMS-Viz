import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConvFiltersVizComponent } from './conv-filters-viz.component';

describe('ConvFiltersVizComponent', () => {
  let component: ConvFiltersVizComponent;
  let fixture: ComponentFixture<ConvFiltersVizComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConvFiltersVizComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConvFiltersVizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
