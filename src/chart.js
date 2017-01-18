const element = require('./element');

module.exports = function BoxPlotChart(Chart) {
  element(Chart);

  const helpers = Chart.helpers;

  Chart.defaults.whisker = {
    hover: {
      mode: 'label'
    },

    scales: {
      xAxes: [{
        type: 'category',

        // grid line settings
        gridLines: {
          offsetGridLines: true
        }
      }],
      yAxes: [{
        type: 'linear'
      }]
    }
  };

  Chart.controllers.whisker = Chart.DatasetController.extend({

    dataElementType: Chart.elements.Whisker,

    initialize: function(chart, datasetIndex) {

      Chart.DatasetController.prototype.initialize
        .call(this, chart, datasetIndex);

      // Use this to indicate that this is a bar dataset.
      this.getMeta().bar = true;
    },

    update: function update(reset) {
      const me = this;
      helpers.each(me.getMeta().data, function(rectangle, index) {
        me.updateElement(rectangle, index, reset);
      }, me);
    },

    updateElement: function updateElement(rectangle, index, reset) {
      const me = this;
      const meta = me.getMeta();
      const xScale = me.getScaleForId(meta.xAxisID);
      const yScale = me.getScaleForId(meta.yAxisID);
      const scaleBase = yScale.getBasePixel();
      const rectangleElementOptions = me.chart.options.elements.rectangle;
      const custom = rectangle.custom || {};
      const dataset = me.getDataset();

      rectangle._xScale = xScale;
      rectangle._yScale = yScale;
      rectangle._datasetIndex = me.index;
      rectangle._index = index;

      const ruler = me.getRuler(index);
      rectangle._model = {
        x: me.calculateBarX(index, me.index, ruler),
        y: reset ? scaleBase : me.boxTopValue(index, me.index),

        // Tooltip
        label: me.chart.data.labels[index],
        datasetLabel: dataset.label,

        // Appearance
        median: reset ? scaleBase : me.medianValue(me.index, index),
        maxV: reset ? scaleBase : me.maxValue(me.index, index),
        minV: reset ? scaleBase : me.minValue(me.index, index),
        base: reset ? scaleBase : me.boxBottomValue(me.index, index),
        width: ruler.barWidth,
        backgroundColor: custom.backgroundColor
          ? custom.backgroundColor
          : helpers.getValueAtIndexOrDefault(me.stddev(me.index, index) > 3
            ? dataset.altBackgroundColor
            : dataset.backgroundColor
          , index, rectangleElementOptions.backgroundColor),
        borderSkipped: custom.borderSkipped
            ? custom.borderSkipped
            : rectangleElementOptions.borderSkipped,
        borderColor: custom.borderColor
          ? custom.borderColor
          : helpers.getValueAtIndexOrDefault(
            dataset.borderColor,
            index,
            rectangleElementOptions.borderColor
        ),
        borderWidth: custom.borderWidth
          ? custom.borderWidth
          : helpers.getValueAtIndexOrDefault(
            dataset.borderWidth,
            index,
          rectangleElementOptions.borderWidth)
      };

      rectangle.pivot();
    },

    stddev: function(datasetIndex, index) {
      const obj = this.getDataset().data[index];
      return parseInt(obj.stddev, 10);
    },

    minValue: function(datasetIndex, index) {
      const me = this;
      const meta = me.getMeta();
      const yScale = me.getScaleForId(meta.yAxisID);
      const obj = me.getDataset().data[index];
      const value = Number(obj.min);

      return yScale.getPixelForValue(value);
    },

    maxValue: function(datasetIndex, index) {
      const me = this;
      const meta = me.getMeta();
      const yScale = me.getScaleForId(meta.yAxisID);
      const obj = me.getDataset().data[index];
      const value = Number(obj.max);

      return yScale.getPixelForValue(value);
    },

    medianValue: function(datasetIndex, index) {
      const me = this;
      const meta = me.getMeta();
      const yScale = me.getScaleForId(meta.yAxisID);
      const obj = me.getDataset().data[index];
      const value = Number(obj.median);

      return yScale.getPixelForValue(value);
    },

    boxBottomValue: function(datasetIndex, index) {
      const me = this;
      const meta = me.getMeta();
      const yScale = me.getScaleForId(meta.yAxisID);
      const obj = me.getDataset().data[index];
      const value = Number(obj.firstQuartile);

      return yScale.getPixelForValue(value);
    },

    boxTopValue: function(index, datasetIndex) {
      const me = this;
      const meta = me.getMeta();
      const yScale = me.getScaleForId(meta.yAxisID);
      const obj = me.getDataset().data[index];
      const value = Number(obj.thirdQuartile);

      return yScale.getPixelForValue(value);
    },

    getRuler: function(index) {
      const me = this;
      const meta = me.getMeta();
      const xScale = me.getScaleForId(meta.xAxisID);

      const barWidth = xScale.getPixelForValue(null, index + 1, 0, me.chart.isCombo)
          - xScale.getPixelForValue(null, index, 0, me.chart.isCombo);

      return {
        barWidth: barWidth
      };
    },

    // Get bar index from the given dataset index accounting
    // for the fact that not all bars are visible
    getBarIndex: function(datasetIndex) {
      let barIndex = 0;

      for (let j = 0; j < datasetIndex; ++j) {
        const meta = this.chart.getDatasetMeta(j);
        if (meta.bar && this.chart.isDatasetVisible(j)) {
          ++barIndex;
        }
      }

      return barIndex;
    },

    calculateBarX: function(index, datasetIndex, ruler) {
      const me = this;
      const meta = me.getMeta();
      const xScale = me.getScaleForId(meta.xAxisID);
      const barIndex = me.getBarIndex(datasetIndex);

      let leftTick = xScale
        .getPixelForValue(null, index, datasetIndex, me.chart.isCombo);

      return leftTick +
        (ruler.barWidth / 2) +
        (ruler.barWidth * barIndex);
    },

    draw: function(ease) {
      const me = this;
      const easingDecimal = ease || 1;
      const metaData = me.getMeta().data;
      const dataset = me.getDataset();
      let i;
      let len;

      for (i = 0, len = metaData.length; i < len; ++i) {
        const d = dataset.data[i];
        if (d !== null
          && d !== undefined
          && typeof d === 'object'
          && !isNaN(d.median)) {
          metaData[i].transition(easingDecimal).draw();
        }
      }
    },

    setHoverStyle: function(rectangle) {
      const dataset = this.chart.data.datasets[rectangle._datasetIndex];
      const index = rectangle._index;

      const custom = rectangle.custom || {};
      const model = rectangle._model;

      model.backgroundColor = custom.hoverBackgroundColor
        ? custom.hoverBackgroundColor
        : helpers.getValueAtIndexOrDefault(
          dataset.hoverBackgroundColor, index,
          helpers.getHoverColor(model.backgroundColor)
      );
      model.borderColor = custom.hoverBorderColor
        ? custom.hoverBorderColor
        : helpers.getValueAtIndexOrDefault(
          dataset.hoverBorderColor, index,
          helpers.getHoverColor(model.borderColor)
      );
      model.borderWidth = custom.hoverBorderWidth
        ? custom.hoverBorderWidth
        : helpers.getValueAtIndexOrDefault(
          dataset.hoverBorderWidth, index, model.borderWidth);
    },

    removeHoverStyle: function(rectangle) {
      const dataset = this.chart.data.datasets[rectangle._datasetIndex];
      const index = rectangle._index;
      const custom = rectangle.custom || {};
      const model = rectangle._model;
      const rectangleElementOptions = this.chart.options.elements.rectangle;

      model.backgroundColor = custom.backgroundColor
        ? custom.backgroundColor
        : helpers.getValueAtIndexOrDefault(
          dataset.backgroundColor, index,
          rectangleElementOptions.backgroundColor
        );
      model.borderColor = custom.borderColor
        ? custom.borderColor
        : helpers.getValueAtIndexOrDefault(
          dataset.borderColor, index, rectangleElementOptions.borderColor);
      model.borderWidth = custom.borderWidth
        ? custom.borderWidth
        : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index,
          rectangleElementOptions.borderWidth
      );
    }
  });
};
