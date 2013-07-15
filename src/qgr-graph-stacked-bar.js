define( [
    'jquery',
    'underscore',
    'backbone',
    'd3',
    ],
function ($, _, Backbone, d3) {


  var StackedBarChart = Backbone.View.extend({

  initialize: function(options) {

    var t = this;
    t.config = t.options.graph_config;
    console.log(t.config);
    t.container = t.options.container;
    t.raw_data = t.options.raw_data;
    t.col = t.config.col;
    t.x_group = t.config.x_group;
    t.y_group = t.config.y_group;
    t.x_format = t.config.x_format || _.identity;
    t.y_format = t.config.y_format || _.identity;

    t.width = $(t.container).width();
    t.height = $(t.container).height();
    t.pad = [20, 70, 30, 20];
    t.x = d3.scale.ordinal()
      .rangeRoundBands([0, t.width - t.pad[1] - t.pad[3]], .1);
    t.y = d3.scale.linear().range([0, t.height - t.pad[0] - t.pad[2]]);

    t.svg = d3.select(t.container).append("svg:svg")
      .attr("class", "qgr-graph-stacked-bar")
      .attr("width", t.width)
      .attr("height", t.height)
      .append("svg:g")
      .attr("transform",
          "translate(" + t.pad[3] + "," + (t.height - t.pad[2]) + ")");

    t.setElement($('.qgr-graph-stacked-bar')[0]);

    // Find the range of unique values in each group.
    t.unique_in_x_group = _.uniq(_.pluck(
      t.raw_data,
      t.x_group
    ))
    .sort();

    t.unique_in_y_group = _.uniq(_.pluck(
      t.raw_data,
      t.y_group
    ));

    var layers = t.map_raw_data(t.raw_data);
    console.log(layers);

    t.color = d3.scale.linear()
      .domain([0, layers.length - 1])
      .range([ "#BCBDDC", "#756BB1" ]);

    var stack = d3.layout.stack()(layers);

    // Compute the x-domain (by date) and y-domain (by top).
    t.x.domain(stack[0].map(function(d) { return d.x; }));

    // It took me awhile to get this, but what we do is look for the max y value
    // of the topmost layer, which is the last element in the stack object.
    t.y.domain([0, d3.max(stack[stack.length - 1],
          function(d) { return d.y0 + d.y; })]);

    // Add a group for each y_group.
    var y_grouped = t.svg.selectAll("g.y_group")
        .data(stack)
      .enter().append("svg:g")
        .attr("class", "y_group")
        .style("fill", function(d, i) { return t.color(i); })
        .style("stroke", function(d, i) {
          return d3.rgb(t.color(i)).darker();
        });

    // Add a rect for each x-y-group.
    var rect = y_grouped.selectAll("rect")
        .data(Object)
      .enter().append("svg:rect")
        .attr("x", function(d) { return t.x(d.x); })
        .attr("y", function(d) { return -t.y(d.y0) - t.y(d.y); })
        .attr("height", function(d) { return t.y(d.y); })
        .attr("width", t.x.rangeBand());

    // Add a label for each x group.
    var label = t.svg.selectAll("text")
        .data(t.x.domain())
      .enter().append("svg:text")
        .attr("x", function(d) { return t.x(d) + t.x.rangeBand() / 2; })
        .attr("y", 6)
        .attr("text-anchor", "middle")
        .attr("dy", ".71em")
        .text(t.x_format);

    // Add y-axis rules.
    var rule = t.svg.selectAll("g.rule")
        .data(t.y.ticks(5))
      .enter().append("svg:g")
        .attr("class", "rule")
        .attr("transform", function(d) {
          return "translate(0," + -t.y(d) + ")";
        });

    rule.append("svg:line")
        .attr("x2", t.width - t.pad[1] - t.pad[3])
        .style("stroke", function(d) { return d ? "#fff" : "#000"; })
        .style("stroke-opacity", function(d) { return d ? .7 : null; });

    rule.append("svg:text")
        .attr("x", t.width - t.pad[1] - t.pad[3] + 6)
        .attr("dy", ".35em")
        .text(t.y_format);
  },

  update: function(raw_data){

    var t = this;

    t.raw_data = raw_data;

    var layers = t.map_raw_data(t.raw_data, t.x_group, t.y_group, t.col);
    console.log(layers);

    var stack = d3.layout.stack()(layers);

    // Add a group for each y_group.
    var y_grouped = t.svg.selectAll("g.y_group")
        .data(stack);

    // Add a rect for each x-y-group.
    var rect = y_grouped.selectAll("rect")
        .data(Object)
        .attr("x", function(d) { return t.x(d.x); })
        .transition()
        .attr("y", function(d) { return -t.y(d.y0) - t.y(d.y); })
        .attr("height", function(d) { return t.y(d.y); })

  },

  map_raw_data: function(raw_data) {

    var t = this;

    // Iterate over every possible combo of group1 and group2 values, and
    // find the associated value from the raw data. If none, supply a default
    // y value of 0 (thickness).
    return _.map(t.unique_in_y_group, function(y_group_val) {
      return _.map(t.unique_in_x_group, function(x_group_val) {
        // Create an object with the filtering criteria.
        xy = {}
        xy[t.x_group] = x_group_val;
        xy[t.y_group] = y_group_val;
        var xy_value = _.findWhere(raw_data, xy);
        var yval = xy_value ? xy_value[t.col] : 0;
        var layer_val = {
          x: x_group_val,
          y: yval
        }
        return layer_val;
      });
    });
  }

});

return StackedBarChart

});

