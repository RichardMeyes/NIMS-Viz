import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MediaMatcher, BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog, MatDialogRef } from '@angular/material';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from './services/data.service';

import { SettingsComponent } from './settings/settings.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  toolbarHeight: number;
  dialogFormRef: MatDialogRef<SettingsComponent>;

  destroyed = new Subject<void>();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private dialog: MatDialog,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.breakpointObserver.observe('(max-width: 600px)').pipe(takeUntil(this.destroyed))
      .subscribe(result => {
        if (result.matches) {
          this.dataService.toolbarHeight.next(56);
        } else {
          this.dataService.toolbarHeight.next(64);
        }
      });

    this.dataService.toolbarHeight
      .pipe(takeUntil(this.destroyed))
      .subscribe(toolbearHeight => { this.toolbarHeight = toolbearHeight; });
  }

  showSettings() {
    this.dialogFormRef = this.dialog.open(SettingsComponent);
  }

  ngOnDestroy(): void {
    this.destroyed.next();
  }
}
