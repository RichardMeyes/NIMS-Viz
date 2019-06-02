import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';

import * as d3 from 'd3';

@Component({
  selector: 'app-ablation-playground',
  templateUrl: './ablation-playground.component.html',
  styleUrls: ['./ablation-playground.component.scss']
})
export class AblationPlaygroundComponent implements OnInit, OnDestroy {
  @ViewChild('container') container;

  defaultSettings;
  inputTopology; inputWeights;

  svg; svgWidth; svgHeight;
  zoom; currTransform;
  vizContainer;

  minWidthHeight;
  topMargin; leftMargin;

  edges;
  layerSpacing;

  topology; weights;
  untrainedWeights;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.defaultSettings = {
      rectSide: 20,
      nodeRadius: 10,
      color: '#373737',
      nodeOpacity: .5,
      nodeStroke: 0,
      duration: 500
    };

    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.inputTopology = val;
        this.draw();
      });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.inputWeights = val;
        this.draw();
      });

    this.dataService.untrainedWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.untrainedWeights = val; });
  }

  draw() {
    // this.activities = [];
    this.resetViz();

    if (this.inputTopology) {
      this.setupTopology();
      this.bindTopology();
    }

    // if (this.inputTopology && this.inputWeights) {
    //   this.setupWeights();
    //   this.bindWeights(runAnimation);
    // }

  }

  setupTopology() {
    let convLayers: number[] = [1];
    let layers: number[] = [];
    const filteredTopology = [];
    const filteredEdges = [];

    convLayers = convLayers.concat(this.inputTopology['conv_layers'].map(conv_layer => +conv_layer.outChannel));
    layers = layers.concat(this.inputTopology['layers'].map(layer => +layer));
    layers.push(10);


    convLayers.forEach((convLayer, convLayerIndex) => {
      let nextLayer = layers[0];
      if (convLayerIndex < convLayers.length - 1) {
        nextLayer = convLayers[convLayerIndex + 1];
      }

      for (let i = 0; i < convLayer; i++) {
        filteredTopology.push({
          layer: convLayerIndex,
          unit: i,
          unitSpacing: (this.minWidthHeight / convLayer),
          isOutput: false,
          isConv: true
        });

        for (let j = 0; j < nextLayer; j++) {
          filteredEdges.push({
            layer: convLayerIndex,
            source: i,
            target: j,
            unitSpacing: (this.minWidthHeight / convLayer),
            targetUnitSpacing: (this.minWidthHeight / nextLayer)
          });
        }
      }
    });

    layers.forEach((layer, layerIndex) => {
      const nextLayer = layers[layerIndex + 1];
      const isOutput = (layerIndex < layers.length - 1) ? false : true;

      for (let i = 0; i < layer; i++) {
        filteredTopology.push({
          layer: convLayers.length + layerIndex,
          unit: i,
          unitSpacing: (this.minWidthHeight / layer),
          isOutput: isOutput,
          isConv: false
        });

        if (!isOutput) {
          for (let j = 0; j < nextLayer; j++) {
            filteredEdges.push({
              layer: convLayers.length + layerIndex,
              source: i,
              target: j,
              unitSpacing: (this.minWidthHeight / layer),
              targetUnitSpacing: (this.minWidthHeight / nextLayer)
            });
          }
        }
      }
    });


    this.layerSpacing = this.minWidthHeight / (convLayers.length + layers.length);
    this.topology = filteredTopology;
    this.edges = filteredEdges;
  }

  bindTopology() {
    const self = this;


    const line = this.vizContainer.selectAll('.edges')
      .data(this.edges);

    line.enter()
      .append('line')
      .attr('class', 'edges')
      .attr('x1', function (d) {
        const x1: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y1', function (d) {
        const y1: number = self.topMargin + (d.unitSpacing * d.source) + (d.unitSpacing / 2);
        return y1;
      })
      .attr('x2', function (d) {
        const x2: number = self.leftMargin + (self.layerSpacing * (d.layer + 1)) + (self.layerSpacing / 2);
        return x2;
      })
      .attr('y2', function (d) {
        const y2: number = self.topMargin + (d.targetUnitSpacing * d.target) + (d.targetUnitSpacing / 2);
        return y2;
      })
      .attr('stroke', this.defaultSettings.color);


    let rects = this.vizContainer.selectAll('rect')
      .data(this.topology.filter(nodes => nodes.isConv));

    rects = rects.enter()
      .append('rect')
      .attr('class', 'rect')
      .attr('x', function (d) {
        const x: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2) - (0.5 * self.defaultSettings.rectSide);
        return x;
      })
      .attr('y', function (d) {
        const y: number = self.topMargin + (d.unitSpacing * d.unit) + (d.unitSpacing / 2) - (0.5 * self.defaultSettings.rectSide);
        return y;
      })
      .attr('width', this.defaultSettings.rectSide)
      .attr('height', this.defaultSettings.rectSide)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity)
      .attr('stroke', this.defaultSettings.color)
      .attr('stroke-width', this.defaultSettings.nodeStroke);

    rects.on('mouseover', function (d) {
      console.clear();
      console.log('SHOW FEATURE MAPS HERE');
      console.log(this);

      d3.select(this)
        .attr('stroke', 'whitesmoke')
        .attr('stroke-width', .5);
    });

    rects.on('mouseout', function (d) {
      d3.select(this)
        .attr('stroke', self.defaultSettings.color)
        .attr('stroke-width', self.defaultSettings.nodeStroke);
    });


    const circles = this.vizContainer.selectAll('circle')
      .data(this.topology.filter(nodes => !nodes.isConv));

    circles.enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', function (d) {
        const cx: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d) {
        const cy: number = self.topMargin + (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', this.defaultSettings.nodeRadius)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity)
      .attr('stroke', this.defaultSettings.color)
      .attr('stroke-width', this.defaultSettings.nodeStroke);
  }

  resetViz() {
    this.svgWidth = this.container.nativeElement.offsetWidth;
    this.svgHeight = Math.max(this.container.nativeElement.offsetHeight - 60, 0);

    this.minWidthHeight = Math.min(this.svgWidth, this.svgHeight);
    this.topMargin = (this.svgHeight - this.minWidthHeight) / 2;
    this.leftMargin = (this.svgWidth - this.minWidthHeight) / 2;


    if (this.svg) { this.svg.remove(); }
    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight);
    this.vizContainer = this.svg.append('g');

    const self = this;
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', () => {
        self.vizContainer.attr('transform', d3.event.transform);
        d3.select('.context-menu').remove();
      })
      .on('end', () => { this.currTransform = d3.event.transform; });
    this.svg.call(this.zoom);

    this.svg.on('contextmenu', () => { d3.event.preventDefault(); });
  }

  showMe() {
    console.clear();
    console.log('source topology:', this.inputTopology);
    console.log('source weights:', this.inputWeights);

    console.log('filtered topology:', this.topology);
    console.log('filtered weights (trained):', this.weights);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
