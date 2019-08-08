import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog, MatDialogRef } from '@angular/material';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from './services/data.service';

import { SettingsComponent } from './settings/settings.component';
import { Playground } from './models/playground.model';
import { Option } from './models/option.model';
import { HeatmapConfig } from './models/heatmap-config.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('snav') snav;

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
          this.toolbarHeight = 56;
        } else {
          this.toolbarHeight = 64;
        }
        this.dataService.toolbarHeight.next(this.toolbarHeight);
      });
  }

  showSettings() {
    this.dialogFormRef = this.dialog.open(SettingsComponent);
  }

  mainNavClicked() {
    this.snav.close();

    this.dataService.activeSceneTab = 0;

    this.dataService.playgroundData = new Playground();
    this.dataService.optionData = new Option(new HeatmapConfig(), false);
    this.dataService.selectedFile = undefined;

    // this.dataService.filterWeights.next(null);
  }

  ngOnDestroy(): void {
    this.destroyed.next();
  }
}
