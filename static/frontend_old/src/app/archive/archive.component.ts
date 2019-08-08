import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil, filter, concatMap } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { PlaygroundService } from '../playground.service';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent implements OnInit, OnDestroy {
  selectedFile;
  epochSliderConfig;

  topology;

  isPlaying;
  animationIntervals;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService,
    private playgroundService: PlaygroundService
  ) { }

  ngOnInit() {
    this.isPlaying = false;
    this.animationIntervals = [];

    this.dataService.visualize
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true),
        concatMap(() => {
          this.selectedFile = this.dataService.selectedFile;
          this.epochSliderConfig = this.dataService.epochSliderConfig;

          return this.playgroundService.getTopology(this.selectedFile);
        })
      )
      .subscribe(val => {
        this.topology = val;
      });
  }

  toggleAnimation() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      const runAnimation = () => {
        if (this.epochSliderConfig.epochValue < this.epochSliderConfig.epochRange[1]) {
          this.epochSliderConfig.epochValue++;
        } else {
          this.epochSliderConfig.epochValue = this.epochSliderConfig.epochRange[0];
        }
        this.epochSliderChange();
      };
      runAnimation();

      this.animationIntervals.push(setInterval(runAnimation, 4.5 * 500 * this.topology.layers.length + 150));
    } else {
      this.animationIntervals.forEach(animationInterval => {
        clearInterval(animationInterval);
      });
      this.animationIntervals = [];
    }
  }

  epochSliderChange() {
    this.dataService.epochSliderConfig = this.epochSliderConfig;
    this.dataService.epochSliderChange.next(true);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
