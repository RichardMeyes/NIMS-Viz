import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkAblatorComponent } from './network-ablator.component';

describe('NetworkAblatorComponent', () => {
  let component: NetworkAblatorComponent;
  let fixture: ComponentFixture<NetworkAblatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkAblatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkAblatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
