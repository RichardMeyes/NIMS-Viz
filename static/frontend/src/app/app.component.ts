import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatDialog, MatDialogRef } from '@angular/material';
import { SettingsComponent } from './settings/settings.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;
  dialogFormRef: MatDialogRef<SettingsComponent>;

  constructor(changeDetectorRef: ChangeDetectorRef, mediaMatcher: MediaMatcher, private dialog: MatDialog) {
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();

    this.mobileQuery = mediaMatcher.matchMedia('(max-width: 600px)');
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  showSettings() {
    this.dialogFormRef = this.dialog.open(SettingsComponent);
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }
}
