module.exports = function BoxPlotElement(Chart) {

  const globalOpts = Chart.defaults.global;

  globalOpts.tooltips.enabled = false;

  globalOpts.elements.rectangle = {
    backgroundColor: globalOpts.defaultColor,
    borderWidth: 0,
    borderColor: globalOpts.defaultColor,
    borderSkipped: 'bottom'
  };

  function isVertical(bar) {
    return bar._view.width !== undefined;
  }

  /**
   * Helper function to get the bounds of the bar regardless of the orientation
   * @private
   * @param bar {Chart.Element.Rectangle} the bar
   * @return {Bounds} bounds of the bar
   */
  function getBarBounds(bar) {
    const vm = bar._view;
    let x1, x2, y1, y2;

    if (isVertical(bar)) {
      // vertical
      const halfWidth = vm.width / 2;
      x1 = vm.x - halfWidth;
      x2 = vm.x + halfWidth;
      y1 = Math.min(vm.y, vm.base);
      y2 = Math.max(vm.y, vm.base);
    } else {
      // horizontal bar
      const halfHeight = vm.height / 2;
      x1 = Math.min(vm.x, vm.base);
      x2 = Math.max(vm.x, vm.base);
      y1 = vm.y - halfHeight;
      y2 = vm.y + halfHeight;
    }

    return {
      left: x1,
      top: y1,
      right: x2,
      bottom: y2
    };
  }

  Chart.elements.Whisker = Chart.Element.extend({
    draw: function draw() {
      const ctx = this._chart.ctx;
      const vm = this._view;

      const halfStroke = vm.borderWidth / 2;
      const halfWidth = vm.width / 2;
      let leftX = vm.x - halfWidth;
      let rightX = vm.x + halfWidth;
      let top = vm.base - (vm.base - vm.y);

      // Canvas doesn't allow us to stroke inside the width so we can
      // adjust the sizes to fit if we're setting a stroke on the line
      if (vm.borderWidth) {
        leftX += halfStroke;
        rightX -= halfStroke;
        top += halfStroke;
      }

      ctx.beginPath();
      ctx.fillStyle = vm.backgroundColor;
      ctx.strokeStyle = vm.borderColor;
      ctx.lineWidth = vm.borderWidth;

      // Corner points, from bottom-left to bottom-right clockwise
      // | 1 2 |
      // | 0 3 |
      const corners = [
        [leftX, vm.base],
        [leftX, top],
        [rightX, top],
        [rightX, vm.base]
      ];

      // Find first (starting) corner with fallback to 'bottom'
      const borders = ['bottom', 'left', 'top', 'right'];
      let startCorner = borders.indexOf(vm.borderSkipped, 0);
      if (startCorner === -1) {
        startCorner = 0;
      }

      function cornerAt(index) {
        return corners[(startCorner + index) % 4];
      }

      // Draw rectangle from 'startCorner'
      let corner = cornerAt(0);
      ctx.moveTo(corner[0], corner[1]);

      for (let i = 1; i < 4; i++) {
        corner = cornerAt(i);
        ctx.lineTo(corner[0], corner[1]);
      }

      ctx.fill();
      if (vm.borderWidth) {
        ctx.stroke();
      }
      ctx.closePath();

      // Median line
      ctx.beginPath();

      ctx.moveTo(leftX, vm.median);
      ctx.lineTo(rightX, vm.median);
      ctx.lineWidth = 2;

      // set line color
      ctx.strokeStyle = 'rgb(54, 74, 205)';
      ctx.stroke();
      ctx.closePath();

      // Top Whisker
      // if (smaller than 5px then do not draw)
      if (vm.median - vm.maxV > 10) {
        ctx.beginPath();
        ctx.moveTo((rightX - leftX) / 2 + leftX, vm.median - 1);
        ctx.lineTo((rightX - leftX) / 2 + leftX, vm.maxV);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgb(245, 93, 93)';
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc((rightX - leftX) / 2 + leftX, vm.maxV, 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgb(245, 93, 93)';
        ctx.fill();
      }

      // Bottom Whisker
      // if (smaller than 5px then do not draw)
      if (vm.minV - vm.median > 10) {
        ctx.beginPath();
        ctx.moveTo((rightX - leftX) / 2 + leftX, vm.median + 1);
        ctx.lineTo((rightX - leftX) / 2 + leftX, vm.minV);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgb(245, 93, 93)';
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc((rightX - leftX) / 2 + leftX, vm.minV, 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgb(245, 93, 93)';
        ctx.fill();
      }
    },
    height: function() {
      const vm = this._view;
      return vm.base - vm.y;
    },
    inRange: function(mouseX, mouseY) {
      let inRange = false;

      if (this._view) {
        const bounds = getBarBounds(this);
        inRange = mouseX >= bounds.left
          && mouseX <= bounds.right
          && mouseY >= bounds.top
          && mouseY <= bounds.bottom;
      }

      return inRange;
    },
    inLabelRange: function(mouseX, mouseY) {
      const me = this;
      if (!me._view) {
        return false;
      }

      const bounds = getBarBounds(me);

      let inRange = false;

      if (isVertical(me)) {
        inRange = mouseX >= bounds.left && mouseX <= bounds.right;
      } else {
        inRange = mouseY >= bounds.top && mouseY <= bounds.bottom;
      }

      return inRange;
    },
    inXRange: function(mouseX) {
      const bounds = getBarBounds(this);
      return mouseX >= bounds.left && mouseX <= bounds.right;
    },
    inYRange: function(mouseY) {
      const bounds = getBarBounds(this);
      return mouseY >= bounds.top && mouseY <= bounds.bottom;
    },
    getCenterPoint: function() {
      const vm = this._view;
      let x, y;
      if (isVertical(this)) {
        x = vm.x;
        y = (vm.y + vm.base) / 2;
      } else {
        x = (vm.x + vm.base) / 2;
        y = vm.y;
      }

      return {
        x, y
      };
    },
    getArea: function() {
      const vm = this._view;
      return vm.width * Math.abs(vm.y - vm.base);
    },
    tooltipPosition: function() {
      const vm = this._view;
      return {
        x: vm.x,
        y: vm.y
      };
    }
  });

};
