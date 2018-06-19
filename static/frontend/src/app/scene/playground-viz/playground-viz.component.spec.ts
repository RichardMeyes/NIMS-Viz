import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaygroundVizComponent } from './playground-viz.component';

describe('PlaygroundVizComponent', () => {
  let component: PlaygroundVizComponent;
  let fixture: ComponentFixture<PlaygroundVizComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlaygroundVizComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlaygroundVizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
