import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InputDrawingComponent } from './input-drawing.component';

describe('InputDrawingComponent', () => {
  let component: InputDrawingComponent;
  let fixture: ComponentFixture<InputDrawingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InputDrawingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InputDrawingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
