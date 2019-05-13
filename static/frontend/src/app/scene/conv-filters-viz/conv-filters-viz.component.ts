import { Component, OnInit, ViewChild } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';

import * as d3 from 'd3';

@Component({
  selector: 'app-conv-filters-viz',
  templateUrl: './conv-filters-viz.component.html',
  styleUrls: ['./conv-filters-viz.component.scss']
})
export class ConvFiltersVizComponent implements OnInit {
  toolbarHeight;
  svg; svgWidth; svgHeight;
  vizGroup;

  convLayers; units;
  selectedConvLayer; selectedUnit;

  weights; filterWeights;
  filterWeightsConfig;

  destroyed = new Subject<void>();

  @ViewChild('vizContainer') vizContainer;

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.filterWeightsConfig = {
      weightsFrame: {
        width: 84,
        height: 84,
        margin: 7.5,
        fill: 'whitesmoke',
        numElements: 0
      },
      positiveColor: d3.interpolateLab('whitesmoke', 'royalblue'),
      negativeColor: d3.interpolateLab('whitesmoke', 'indianred')
    };

    this.dataService.toolbarHeight
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.toolbarHeight = val; });

    this.dataService.filterWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.weights = val;

        this.convLayers = [];
        if (val) {
          Object.keys(val).forEach(key => {
            this.convLayers.push(key);
          });
          this.selectedConvLayer = this.convLayers[0];
          this.selectedUnit = 0;

          this.convLayerSelected();
        }
      });
  }

  convLayerSelected() {
      this.filterWeights = [...this.weights[this.selectedConvLayer]];

      this.units = [];
      for (let i = 0; i < this.filterWeights.length; i++) {
        this.units.push(i);
      }
      this.selectedUnit = 0;

      this.showFilterWeights();
  }

  showFilterWeights() {
    const self = this;
    this.filterWeights = [...this.weights[this.selectedConvLayer][this.selectedUnit]];

    this.resetViz();

    const weightsFrame = this.vizGroup.selectAll('rect')
      .data(this.filterWeights)
      .enter()
      .append('g');

    weightsFrame.append('rect')
      .attr('x', function (d, i) {
        const currIndex = i % self.filterWeightsConfig.weightsFrame.numElements;
        const x = currIndex * (self.filterWeightsConfig.weightsFrame.width + (2 * self.filterWeightsConfig.weightsFrame.margin));

        return x;
      })
      .attr('y', function (d, i) {
        const currIndex = Math.floor(i / self.filterWeightsConfig.weightsFrame.numElements);
        const y = currIndex * (self.filterWeightsConfig.weightsFrame.height + (2 * self.filterWeightsConfig.weightsFrame.margin));

        return y;
      })
      .attr('width', this.filterWeightsConfig.weightsFrame.width)
      .attr('height', this.filterWeightsConfig.weightsFrame.height)
      .style('fill', this.filterWeightsConfig.weightsFrame.fill);

    console.clear();
    console.log(this.selectedConvLayer);
    console.log(this.selectedUnit);
    console.log(this.filterWeights);
  }

  resetViz() {
    this.svgWidth = window.innerWidth / 2;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.dataService.bottomMargin) - 78.125;

    this.filterWeightsConfig.weightsFrame.numElements = Math.floor(this.svgWidth /
      (this.filterWeightsConfig.weightsFrame.width + 2 * this.filterWeightsConfig.weightsFrame.margin));

    if (this.svg) { this.svg.remove(); }
    this.svg = d3.select(this.vizContainer.nativeElement)
      .append('svg')
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight)
    this.vizGroup = this.svg.append('g');
  }
}
