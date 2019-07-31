import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkCreatorComponent } from './network-creator.component';

describe('NetworkCreatorComponent', () => {
  let component: NetworkCreatorComponent;
  let fixture: ComponentFixture<NetworkCreatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkCreatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
