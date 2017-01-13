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

        // Specific to Bar Controller
        categoryPercentage: 0.8,
        barPercentage: 0.9,

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

    // Get the number of datasets that display bars.
    // We use this to correctly calculate the bar width
    getBarCount: function() {
      const me = this;
      let barCount = 0;

      helpers.each(me.chart.data.datasets, (dataset, datasetIndex) => {
        const meta = me.chart.getDatasetMeta(datasetIndex);
        if (meta.bar && me.chart.isDatasetVisible(datasetIndex)) {
          ++barCount;
        }
      }, me);
      return barCount;
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
        width: me.calculateBarWidth(ruler),
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
      const value = parseInt(obj.min, 10);

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
      const datasetCount = me.getBarCount();

      let tickWidth;

      if (xScale.options.type === 'category') {
        tickWidth = xScale.getPixelForTick(index + 1)
          - xScale.getPixelForTick(index);
      } else {
        // Average width
        tickWidth = xScale.width / xScale.ticks.length;
      }

      const categoryWidth = tickWidth * xScale.options.categoryPercentage;
      const categorySpacing = (
        tickWidth - (tickWidth * xScale.options.categoryPercentage)
      ) / 2;

      let fullBarWidth = categoryWidth / datasetCount;

      if (xScale.ticks.length !== me.chart.data.labels.length) {
        const perc = xScale.ticks.length / me.chart.data.labels.length;
        fullBarWidth = fullBarWidth * perc;
      }

      const barWidth = fullBarWidth * xScale.options.barPercentage;
      const barSpacing = fullBarWidth
        - (fullBarWidth * xScale.options.barPercentage);

      return {
        datasetCount: datasetCount,
        tickWidth: tickWidth,
        categoryWidth: categoryWidth,
        categorySpacing: categorySpacing,
        fullBarWidth: fullBarWidth,
        barWidth: barWidth,
        barSpacing: barSpacing
      };
    },

    calculateBarWidth: function(ruler) {
      const xScale = this.getScaleForId(this.getMeta().xAxisID);
      if (xScale.options.barThickness) {
        return xScale.options.barThickness;
      }
      return ruler.barWidth;
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

      leftTick -= me.chart.isCombo ? (ruler.tickWidth / 2) : 0;

      return leftTick +
        (ruler.barWidth / 2) +
        ruler.categorySpacing +
        (ruler.barWidth * barIndex) +
        (ruler.barSpacing / 2) +
        (ruler.barSpacing * barIndex);
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
