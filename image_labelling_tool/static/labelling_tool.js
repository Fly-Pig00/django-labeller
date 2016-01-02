/*
The MIT License (MIT)

Copyright (c) 2015 University of East Anglia, Norwich, UK

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Developed by Geoffrey French in collaboration with Dr. M. Fisher and
Dr. M. Mackiewicz.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="d3.d.ts" />
/// <reference path="jquery.d.ts" />
/// <reference path="polyk.d.ts" />
var labelling_tool;
(function (labelling_tool) {
    function ensure_flag_exists(x, flag_name, default_value) {
        var v = x[flag_name];
        if (v === undefined) {
            x[flag_name] = default_value;
        }
        return x[flag_name];
    }
    /*
    Colour utility functions
     */
    function lighten_colour(rgb, amount) {
        var x = 1.0 - amount;
        return [Math.round(rgb[0] * x + 255 * amount),
            Math.round(rgb[1] * x + 255 * amount),
            Math.round(rgb[2] * x + 255 * amount)];
    }
    function rgb_to_rgba_string(rgb, alpha) {
        return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
    }
    function compute_centroid_of_points(vertices) {
        var sum = [0.0, 0.0];
        var N = vertices.length;
        if (N === 0) {
            return { x: 0, y: 0 };
        }
        else {
            for (var i = 0; i < N; i++) {
                var vtx = vertices[i];
                sum[0] += vtx.x;
                sum[1] += vtx.y;
            }
            var scale = 1.0 / N;
            return { x: sum[0] * scale, y: sum[1] * scale };
        }
    }
    /*
    Axis-aligned box
     */
    var AABox = (function () {
        function AABox(lower, upper) {
            this.lower = lower;
            this.upper = upper;
        }
        AABox.prototype.contains_point = function (point) {
            return point.x >= this.lower.x && point.x <= this.upper.x &&
                point.y >= this.lower.y && point.y <= this.upper.y;
        };
        return AABox;
    })();
    function AABox_from_points(array_of_points) {
        if (array_of_points.length > 0) {
            var first = array_of_points[0];
            var lower = { x: first.x, y: first.y };
            var upper = { x: first.x, y: first.y };
            for (var i = 1; i < array_of_points.length; i++) {
                var p = array_of_points[i];
                lower.x = Math.min(lower.x, p.x);
                lower.y = Math.min(lower.y, p.y);
                upper.x = Math.max(upper.x, p.x);
                upper.y = Math.max(upper.y, p.y);
            }
            return new AABox(lower, upper);
        }
        else {
            return new AABox({ x: 0, y: 0 }, { x: 0, y: 0 });
        }
    }
    function AABox_from_aaboxes(array_of_boxes) {
        if (array_of_boxes.length > 0) {
            var first = array_of_boxes[0];
            var result = new AABox({ x: first.lower.x, y: first.lower.y }, { x: first.upper.x, y: first.upper.y });
            for (var i = 1; i < array_of_boxes.length; i++) {
                var box = array_of_boxes[i];
                result.lower.x = Math.min(result.lower.x, box.lower.x);
                result.lower.y = Math.min(result.lower.y, box.lower.y);
                result.upper.x = Math.max(result.upper.x, box.upper.x);
                result.upper.y = Math.max(result.upper.y, box.upper.y);
            }
            return result;
        }
        else {
            return new AABox({ x: 1, y: 1 }, { x: -1, y: -1 });
        }
    }
    /*
    Object ID table
     */
    var ObjectIDTable = (function () {
        function ObjectIDTable() {
            this._id_counter = 1;
            this._id_to_object = {};
        }
        ObjectIDTable.prototype.get = function (id) {
            return this._id_to_object[id];
        };
        ObjectIDTable.prototype.register = function (obj) {
            var id;
            if ('object_id' in obj && obj.object_id !== null) {
                id = obj.object_id;
                this._id_counter = Math.max(this._id_counter, id + 1);
                this._id_to_object[id] = obj;
            }
            else {
                id = this._id_counter;
                this._id_counter += 1;
                this._id_to_object[id] = obj;
            }
        };
        ObjectIDTable.prototype.unregister = function (obj) {
            delete this._id_to_object[obj.object_id];
            obj.object_id = null;
        };
        ObjectIDTable.prototype.register_objects = function (object_array) {
            var obj, id, i;
            for (i = 0; i < object_array.length; i++) {
                obj = object_array[i];
                if ('object_id' in obj && obj.object_id !== null) {
                    id = obj.object_id;
                    this._id_counter = Math.max(this._id_counter, id + 1);
                    this._id_to_object[id] = obj;
                }
            }
            for (i = 0; i < object_array.length; i++) {
                obj = object_array[i];
                if ('object_id' in obj && obj.object_id !== null) {
                }
                else {
                    id = this._id_counter;
                    this._id_counter += 1;
                    this._id_to_object[id] = obj;
                    obj.object_id = id;
                }
            }
        };
        ObjectIDTable.get_id = function (x) {
            if ('object_id' in x && x.object_id !== null) {
                return x.object_id;
            }
            else {
                return null;
            }
        };
        return ObjectIDTable;
    })();
    var get_label_header_labels = function (label_header) {
        var labels = label_header.labels;
        if (labels === undefined || labels === null) {
            return [];
        }
        else {
            return labels;
        }
    };
    var replace_label_header_labels = function (label_header, labels) {
        return { image_id: label_header.image_id,
            complete: label_header.complete,
            labels: labels };
    };
    function new_PolygonalLabelModel() {
        return { label_type: 'polygon', label_class: null, vertices: [] };
    }
    function new_CompositeLabelModel() {
        return { label_type: 'composite', label_class: null, components: [] };
    }
    function new_GroupLabelModel() {
        return { label_type: 'group', label_class: null, component_models: [] };
    }
    /*
    Abstract label entity
     */
    var AbstractLabelEntity = (function () {
        function AbstractLabelEntity(view, model) {
            this.root_view = view;
            this.model = model;
            this._attached = this._hover = this._selected = false;
            this._event_listeners = [];
            this.parent_entity = null;
        }
        AbstractLabelEntity.prototype.add_event_listener = function (listener) {
            this._event_listeners.push(listener);
        };
        AbstractLabelEntity.prototype.remove_event_listener = function (listener) {
            var i = this._event_listeners.indexOf(listener);
            if (i !== -1) {
                this._event_listeners.splice(i, 1);
            }
        };
        AbstractLabelEntity.prototype.set_parent = function (parent) {
            var was_root = this.parent_entity === null;
            this.parent_entity = parent;
            var is_root = this.parent_entity === null;
            if (was_root && !is_root) {
                this.root_view._unregister_root_entity(this);
            }
            else if (!was_root && is_root) {
                this.root_view._register_root_entity(this);
            }
        };
        AbstractLabelEntity.prototype.attach = function () {
            this.root_view._register_entity(this);
            this._attached = true;
        };
        AbstractLabelEntity.prototype.detach = function () {
            this._attached = false;
            if (this.parent_entity === null) {
                this.root_view._unregister_root_entity(this);
            }
            this.root_view._unregister_entity(this);
        };
        AbstractLabelEntity.prototype.destroy = function (commit) {
            if (this.parent_entity !== null) {
                this.root_view.remove_root_entity(this, commit);
            }
        };
        AbstractLabelEntity.prototype.update = function () {
        };
        AbstractLabelEntity.prototype.commit = function () {
        };
        AbstractLabelEntity.prototype.hover = function (state) {
            this._hover = state;
            this._update_style();
        };
        AbstractLabelEntity.prototype.select = function (state) {
            this._selected = state;
            this._update_style();
        };
        AbstractLabelEntity.prototype.notify_hide_labels_change = function () {
            this._update_style();
        };
        AbstractLabelEntity.prototype.get_label_class = function () {
            return this.model.label_class;
        };
        AbstractLabelEntity.prototype.set_label_class = function (label_class) {
            this.model.label_class = label_class;
            this._update_style();
            this.commit();
        };
        AbstractLabelEntity.prototype._update_style = function () {
        };
        ;
        AbstractLabelEntity.prototype.compute_centroid = function () {
            return null;
        };
        AbstractLabelEntity.prototype.compute_bounding_box = function () {
            return null;
        };
        ;
        AbstractLabelEntity.prototype.distance_to_point = function (point) {
            return null;
        };
        ;
        AbstractLabelEntity.prototype.notify_model_destroyed = function (model_id) {
        };
        ;
        return AbstractLabelEntity;
    })();
    /*
    Polygonal label entity
     */
    var PolygonalLabelEntity = (function (_super) {
        __extends(PolygonalLabelEntity, _super);
        function PolygonalLabelEntity(view, model) {
            _super.call(this, view, model);
            this._polyk_poly = [];
            this.poly = null;
            this.shape_line = null;
        }
        PolygonalLabelEntity.prototype.attach = function () {
            var _this = this;
            _super.prototype.attach.call(this);
            this.shape_line = d3.svg.line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })
                .interpolate("linear-closed");
            this.poly = this.root_view.world.append("path");
            this.poly.data(this.model.vertices).attr("d", this.shape_line(this.model.vertices));
            this.poly.on("mouseover", function () {
                for (var i = 0; i < _this._event_listeners.length; i++) {
                    _this._event_listeners[i].on_mouse_in(_this);
                }
            });
            this.poly.on("mouseout", function () {
                for (var i = 0; i < _this._event_listeners.length; i++) {
                    _this._event_listeners[i].on_mouse_out(_this);
                }
            });
            this._update_polyk_poly();
            this._update_style();
        };
        ;
        PolygonalLabelEntity.prototype.detach = function () {
            this.poly.remove();
            this.poly = null;
            this.shape_line = null;
            this._polyk_poly = [];
            _super.prototype.detach.call(this);
        };
        ;
        PolygonalLabelEntity.prototype._update_polyk_poly = function () {
            this._polyk_poly = [];
            for (var i = 0; i < this.model.vertices.length; i++) {
                this._polyk_poly.push(this.model.vertices[i].x);
                this._polyk_poly.push(this.model.vertices[i].y);
            }
        };
        PolygonalLabelEntity.prototype.update = function () {
            this.poly.data(this.model.vertices).attr("d", this.shape_line(this.model.vertices));
            this._update_polyk_poly();
        };
        PolygonalLabelEntity.prototype.commit = function () {
            this.root_view.commit_model(this.model);
        };
        PolygonalLabelEntity.prototype._update_style = function () {
            if (this._attached) {
                var stroke_colour_rgb = this._selected ? [255, 0, 0] : [255, 255, 0];
                var stroke_colour;
                if (this.root_view.view.hide_labels) {
                    stroke_colour = rgb_to_rgba_string(stroke_colour_rgb, 0.2);
                    this.poly.attr("style", "fill:none;stroke:" + stroke_colour + ";stroke-width:1");
                }
                else {
                    var fill_colour = this.root_view.view.colour_for_label_class(this.model.label_class);
                    if (this._hover) {
                        fill_colour = lighten_colour(fill_colour, 0.4);
                    }
                    fill_colour = rgb_to_rgba_string(fill_colour, 0.35);
                    stroke_colour = rgb_to_rgba_string(stroke_colour_rgb, 0.5);
                    this.poly.attr("style", "fill:" + fill_colour + ";stroke:" + stroke_colour + ";stroke-width:1");
                }
            }
        };
        PolygonalLabelEntity.prototype.compute_centroid = function () {
            return compute_centroid_of_points(this.model.vertices);
        };
        PolygonalLabelEntity.prototype.compute_bounding_box = function () {
            return AABox_from_points(this.model.vertices);
        };
        PolygonalLabelEntity.prototype.distance_to_point = function (point) {
            if (PolyK.ContainsPoint(this._polyk_poly, point.x, point.y)) {
                return 0.0;
            }
            else {
                var e = PolyK.ClosestEdge(this._polyk_poly, point.x, point.y);
                return e.dist;
            }
        };
        return PolygonalLabelEntity;
    })(AbstractLabelEntity);
    /*
    Composite label entity
     */
    var CompositeLabelEntity = (function (_super) {
        __extends(CompositeLabelEntity, _super);
        function CompositeLabelEntity(view, model) {
            _super.call(this, view, model);
        }
        CompositeLabelEntity.prototype.attach = function () {
            _super.prototype.attach.call(this);
            this.circle = this.root_view.world.append("circle")
                .attr('r', 8.0);
            this.central_circle = this.root_view.world.append("circle")
                .attr("pointer-events", "none")
                .attr('r', 4.0);
            this.shape_line = d3.svg.line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })
                .interpolate("linear-closed");
            this.connections_group = null;
            this.update();
            var self = this;
            this.circle.on("mouseover", function () {
                self._on_mouse_over_event();
            }).on("mouseout", function () {
                self._on_mouse_out_event();
            });
            this._update_style();
        };
        CompositeLabelEntity.prototype.detach = function () {
            this.circle.remove();
            this.central_circle.remove();
            this.connections_group.remove();
            this.circle = null;
            this.central_circle = null;
            this.shape_line = null;
            this.connections_group = null;
            _super.prototype.detach.call(this);
        };
        CompositeLabelEntity.prototype._on_mouse_over_event = function () {
            for (var i = 0; i < this._event_listeners.length; i++) {
                this._event_listeners[i].on_mouse_in(this);
            }
        };
        CompositeLabelEntity.prototype._on_mouse_out_event = function () {
            for (var i = 0; i < this._event_listeners.length; i++) {
                this._event_listeners[i].on_mouse_out(this);
            }
        };
        CompositeLabelEntity.prototype.update = function () {
            var component_centroids = this._compute_component_centroids();
            var centroid = compute_centroid_of_points(component_centroids);
            this.circle
                .attr('cx', centroid.x)
                .attr('cy', centroid.y);
            this.central_circle
                .attr('cx', centroid.x)
                .attr('cy', centroid.y);
            if (this.connections_group !== null) {
                this.connections_group.remove();
                this.connections_group = null;
            }
            this.connections_group = this.root_view.world.append("g");
            for (var i = 0; i < component_centroids.length; i++) {
                this.connections_group.append("path")
                    .attr("d", this.shape_line([centroid, component_centroids[i]]))
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "3, 3")
                    .attr("style", "stroke:rgba(255,0,255,0.6);");
                this.connections_group.append("circle")
                    .attr("cx", component_centroids[i].x)
                    .attr("cy", component_centroids[i].y)
                    .attr("r", 3)
                    .attr("stroke-width", 1)
                    .attr("style", "stroke:rgba(255,0,255,0.6);fill: rgba(255,0,255,0.25);");
            }
        };
        CompositeLabelEntity.prototype.commit = function () {
            this.root_view.commit_model(this.model);
        };
        CompositeLabelEntity.prototype._update_style = function () {
            if (this._attached) {
                var stroke_colour_rgb = this._selected ? [255, 0, 0] : [255, 255, 0];
                var stroke_colour;
                if (this.root_view.view.hide_labels) {
                    stroke_colour = rgb_to_rgba_string(stroke_colour_rgb, 0.2);
                    this.circle.attr("style", "fill:none;stroke:" + stroke_colour + ";stroke-width:1");
                    this.connections_group.selectAll("path")
                        .attr("style", "stroke:rgba(255,0,255,0.2);");
                    this.connections_group.selectAll("circle")
                        .attr("style", "stroke:rgba(255,0,255,0.2);fill: none;");
                }
                else {
                    var circle_fill_colour_rgb = [255, 128, 255];
                    var central_circle_fill_colour_rgb = this.root_view.view.colour_for_label_class(this.model.label_class);
                    var connection_fill_colour_rgb = [255, 0, 255];
                    var connection_stroke_colour_rgb = [255, 0, 255];
                    if (this._hover) {
                        circle_fill_colour_rgb = lighten_colour(circle_fill_colour_rgb, 0.4);
                        central_circle_fill_colour_rgb = lighten_colour(central_circle_fill_colour_rgb, 0.4);
                        connection_fill_colour_rgb = lighten_colour(connection_fill_colour_rgb, 0.4);
                        connection_stroke_colour_rgb = lighten_colour(connection_stroke_colour_rgb, 0.4);
                    }
                    var circle_fill_colour = rgb_to_rgba_string(circle_fill_colour_rgb, 0.35);
                    var central_circle_fill_colour = rgb_to_rgba_string(central_circle_fill_colour_rgb, 0.35);
                    var connection_fill_colour = rgb_to_rgba_string(connection_fill_colour_rgb, 0.25);
                    var connection_stroke_colour = rgb_to_rgba_string(connection_stroke_colour_rgb, 0.6);
                    stroke_colour = rgb_to_rgba_string(stroke_colour_rgb, 0.5);
                    this.circle.attr("style", "fill:" + circle_fill_colour + ";stroke:" + connection_stroke_colour + ";stroke-width:1");
                    this.central_circle.attr("style", "fill:" + central_circle_fill_colour + ";stroke:" + stroke_colour + ";stroke-width:1");
                    this.connections_group.selectAll("path")
                        .attr("style", "stroke:rgba(255,0,255,0.6);");
                    this.connections_group.selectAll("circle")
                        .attr("style", "stroke:" + connection_stroke_colour + ";fill:" + connection_fill_colour + ";");
                }
            }
        };
        CompositeLabelEntity.prototype._compute_component_centroids = function () {
            var component_centroids = [];
            for (var i = 0; i < this.model.components.length; i++) {
                var model_id = this.model.components[i];
                var entity = this.root_view.get_entity_for_model_id(model_id);
                var centroid = entity.compute_centroid();
                component_centroids.push(centroid);
            }
            return component_centroids;
        };
        CompositeLabelEntity.prototype.compute_centroid = function () {
            return compute_centroid_of_points(this._compute_component_centroids());
        };
        ;
        CompositeLabelEntity.prototype.compute_bounding_box = function () {
            var centre = this.compute_centroid();
            return new AABox({ x: centre.x - 1, y: centre.y - 1 }, { x: centre.x + 1, y: centre.y + 1 });
        };
        CompositeLabelEntity.prototype.notify_model_destroyed = function (model_id) {
            var index = this.model.components.indexOf(model_id);
            if (index !== -1) {
                // Remove the model ID from the components array
                this.model.components = this.model.components.slice(0, index).concat(this.model.components.slice(index + 1));
                this.update();
            }
        };
        return CompositeLabelEntity;
    })(AbstractLabelEntity);
    /*
    Group label entity
     */
    var GroupLabelEntity = (function (_super) {
        __extends(GroupLabelEntity, _super);
        function GroupLabelEntity(view, model) {
            _super.call(this, view, model);
            var self = this;
            this._component_event_listener = {
                on_mouse_in: function (entity) {
                    for (var i = 0; i < self._event_listeners.length; i++) {
                        self._event_listeners[i].on_mouse_in(self);
                    }
                },
                on_mouse_out: function (entity) {
                    for (var i = 0; i < self._event_listeners.length; i++) {
                        self._event_listeners[i].on_mouse_out(self);
                    }
                }
            };
        }
        GroupLabelEntity.prototype.attach = function () {
            _super.prototype.attach.call(this);
            this._bounding_rect = this.root_view.world.append("rect")
                .attr("pointer-events", "none")
                .attr("x", 0).attr("y", 0)
                .attr("width", 0).attr("height", 0)
                .attr("visibility", "hidden");
            // Initialise child entities
            this._component_entities = [];
            var component_bboxes = [];
            for (var i = 0; i < this.model.component_models.length; i++) {
                var model = this.model.component_models[i];
                var model_entity = this.root_view.get_or_create_entity_for_model(model);
                this._component_entities.push(model_entity);
                component_bboxes.push(model_entity.compute_bounding_box());
                model_entity.add_event_listener(this._component_event_listener);
                model_entity.set_parent(this);
            }
            this._bounding_aabox = AABox_from_aaboxes(component_bboxes);
            this.update();
            this._update_style();
        };
        ;
        GroupLabelEntity.prototype.detach = function () {
            for (var i = 0; i < this._component_entities.length; i++) {
                var entity = this._component_entities[i];
                this.root_view._unregister_entity(entity);
            }
            this._bounding_rect.remove();
            _super.prototype.detach.call(this);
        };
        ;
        GroupLabelEntity.prototype.destroy = function (commit) {
            for (var i = 0; i < this._component_entities.length; i++) {
                var entity = this._component_entities[i];
                entity.remove_event_listener(this._component_event_listener);
                entity.set_parent(this.parent_entity);
            }
            this._component_entities = [];
            this.root_view.remove_root_entity(this, commit);
        };
        GroupLabelEntity.prototype.update = function () {
            this._bounding_rect
                .attr('x', this._bounding_aabox.lower.x)
                .attr('y', this._bounding_aabox.lower.y)
                .attr('width', this._bounding_aabox.upper.x - this._bounding_aabox.lower.x)
                .attr('height', this._bounding_aabox.upper.y - this._bounding_aabox.lower.y);
        };
        GroupLabelEntity.prototype.commit = function () {
            this.root_view.commit_model(this.model);
        };
        GroupLabelEntity.prototype.select = function (state) {
            for (var i = 0; i < this._component_entities.length; i++) {
                this._component_entities[i].select(state);
            }
            _super.prototype.select.call(this, state);
        };
        GroupLabelEntity.prototype.hover = function (state) {
            for (var i = 0; i < this._component_entities.length; i++) {
                this._component_entities[i].hover(state);
            }
            _super.prototype.hover.call(this, state);
        };
        GroupLabelEntity.prototype._update_style = function () {
            if (this._attached) {
                if (this._selected) {
                    if (this._hover) {
                        this._bounding_rect.attr("style", "stroke:rgba(192,128,255,0.8); fill:rgba(192,128,255,0.2); line-width: 1.0px;")
                            .attr("visibility", "visible");
                    }
                    else {
                        this._bounding_rect.attr("style", "stroke:rgba(192,128,255,0.6); fill:none; line-width: 1.0px;")
                            .attr("visibility", "visible");
                    }
                }
                else {
                    if (this._hover) {
                        this._bounding_rect.attr("style", "stroke:rgba(192,128,255,0.4); fill:none; line-width: 1.0px;")
                            .attr("visibility", "visible");
                    }
                    else {
                        this._bounding_rect.attr("visibility", "hidden");
                    }
                }
            }
        };
        GroupLabelEntity.prototype._compute_component_centroids = function () {
            var component_centroids = [];
            for (var i = 0; i < this._component_entities.length; i++) {
                var entity = this._component_entities[i];
                var centroid = entity.compute_centroid();
                component_centroids.push(centroid);
            }
            return component_centroids;
        };
        ;
        GroupLabelEntity.prototype.compute_centroid = function () {
            return compute_centroid_of_points(this._compute_component_centroids());
        };
        ;
        GroupLabelEntity.prototype.compute_bounding_box = function () {
            var centre = this.compute_centroid();
            return new AABox({ x: centre.x - 1, y: centre.y - 1 }, { x: centre.x + 1, y: centre.y + 1 });
        };
        ;
        return GroupLabelEntity;
    })(AbstractLabelEntity);
    /*
    Map label type to entity constructor
     */
    var label_type_to_entity_factory = {
        'polygon': function (root_view, model) {
            return new PolygonalLabelEntity(root_view, model);
        },
        'composite': function (root_view, model) {
            return new CompositeLabelEntity(root_view, model);
        },
        'group': function (root_view, model) {
            return new GroupLabelEntity(root_view, model);
        }
    };
    /*
    Construct entity for given label model.
    Uses the map above to choose the appropriate constructor
     */
    var new_entity_for_model = function (root_view, label_model) {
        var factory = label_type_to_entity_factory[label_model.label_type];
        return factory(root_view, label_model);
    };
    /*
    Label view root
     */
    var RootLabelView = (function () {
        function RootLabelView(model, root_listener, entity_listener, ltool, world) {
            this.model = model;
            this._all_entities = [];
            this.root_entities = [];
            this.selected_entities = [];
            // Label model object table
            this._label_model_obj_table = new ObjectIDTable();
            // Label model object ID to entity
            this._label_model_id_to_entity = {};
            this.root_listener = root_listener;
            this._entity_event_listener = entity_listener;
            this.view = ltool;
            this.world = world;
        }
        /*
        Set model
         */
        RootLabelView.prototype.set_model = function (model) {
            // Remove all entities
            while (this.root_entities.length > 0) {
                this.shutdown_entity(this.root_entities[this.root_entities.length - 1]);
            }
            // Update the labels
            this.model = model;
            var labels = get_label_header_labels(this.model);
            // Set up the ID counter; ensure that it's value is 1 above the maximum label ID in use
            this._label_model_obj_table = new ObjectIDTable();
            this._label_model_obj_table.register_objects(labels);
            this._label_model_id_to_entity = {};
            for (var i = 0; i < labels.length; i++) {
                var label = labels[i];
                var entity = new_entity_for_model(this, label);
                this.initialise_entity(entity);
                this._register_root_entity(entity);
            }
        };
        /*
        Set complete
         */
        RootLabelView.prototype.set_complete = function (complete) {
            this.model.complete = complete;
        };
        RootLabelView.prototype.get_current_image_id = function () {
            if (this.model !== null && this.model !== undefined) {
                return this.model.image_id;
            }
            else {
                return null;
            }
        };
        ;
        /*
        Set label visibility
         */
        RootLabelView.prototype.set_label_visibility = function (visibility) {
            for (var i = 0; i < this._all_entities.length; i++) {
                this._all_entities[i].notify_hide_labels_change();
            }
        };
        /*
        Select an entity
         */
        RootLabelView.prototype.select_entity = function (entity, multi_select, invert) {
            multi_select = multi_select === undefined ? false : multi_select;
            if (multi_select) {
                var index = this.selected_entities.indexOf(entity);
                var changed = false;
                if (invert) {
                    if (index === -1) {
                        // Add
                        this.selected_entities.push(entity);
                        entity.select(true);
                        changed = true;
                    }
                    else {
                        // Remove
                        this.selected_entities.splice(index, 1);
                        entity.select(false);
                        changed = true;
                    }
                }
                else {
                    if (index === -1) {
                        // Add
                        this.selected_entities.push(entity);
                        entity.select(true);
                        changed = true;
                    }
                }
                if (changed) {
                    this.root_listener.on_selection_changed(this);
                }
            }
            else {
                var prev_entity = this.get_selected_entity();
                if (prev_entity !== entity) {
                    for (var i = 0; i < this.selected_entities.length; i++) {
                        this.selected_entities[i].select(false);
                    }
                    this.selected_entities = [entity];
                    entity.select(true);
                }
                this.root_listener.on_selection_changed(this);
            }
        };
        ;
        /*
        Unselect all entities
         */
        RootLabelView.prototype.unselect_all_entities = function () {
            for (var i = 0; i < this.selected_entities.length; i++) {
                this.selected_entities[i].select(false);
            }
            this.selected_entities = [];
            this.root_listener.on_selection_changed(this);
        };
        ;
        /*
        Get uniquely selected entity
         */
        RootLabelView.prototype.get_selected_entity = function () {
            return this.selected_entities.length == 1 ? this.selected_entities[0] : null;
        };
        ;
        /*
        Get selected entities
         */
        RootLabelView.prototype.get_selection = function () {
            return this.selected_entities;
        };
        ;
        /*
        Get all entities
         */
        RootLabelView.prototype.get_entities = function () {
            return this.root_entities;
        };
        ;
        /*
        Commit model
        invoke when a model is modified
        inserts the model into the tool data model and ensures that the relevant change events get send over
         */
        RootLabelView.prototype.commit_model = function (model) {
            var labels = get_label_header_labels(this.model);
            var index = labels.indexOf(model);
            if (index !== -1) {
                this.root_listener.root_list_changed(this);
            }
        };
        ;
        /*
        Create composite label
         */
        RootLabelView.prototype.create_composite_label_from_selection = function () {
            var N = this.selected_entities.length;
            if (N > 0) {
                var model = new_CompositeLabelModel();
                var entity = new CompositeLabelEntity(this, model);
                for (var i = 0; i < this.selected_entities.length; i++) {
                    var model_id = ObjectIDTable.get_id(this.selected_entities[i].model);
                    model.components.push(model_id);
                }
                return entity;
            }
            else {
                return null;
            }
        };
        /*
        Create group label
         */
        RootLabelView.prototype.create_group_label_from_selection = function () {
            var N = this.selected_entities.length;
            if (N > 0) {
                var model = new_GroupLabelModel();
                for (var i = 0; i < this.selected_entities.length; i++) {
                    var entity = this.selected_entities[i];
                    model.component_models.push(entity.model);
                }
                var group_entity = new GroupLabelEntity(this, model);
                this.add_root_entity(group_entity, true);
                return group_entity;
            }
            else {
                return null;
            }
        };
        /*
        Destroy selection
         */
        RootLabelView.prototype.delete_selection = function () {
            var entities_to_remove = this.selected_entities.slice();
            this.unselect_all_entities();
            for (var i = 0; i < entities_to_remove.length; i++) {
                this.remove_root_entity(entities_to_remove[i], true);
            }
        };
        /*
        Register and unregister entities
         */
        RootLabelView.prototype._register_entity = function (entity) {
            this._all_entities.push(entity);
            this._label_model_obj_table.register(entity.model);
            this._label_model_id_to_entity[entity.model.object_id] = entity;
        };
        ;
        RootLabelView.prototype._unregister_entity = function (entity) {
            var index = this._all_entities.indexOf(entity);
            if (index === -1) {
                throw "Attempting to unregister entity that is not in _all_entities";
            }
            // Notify all entities of the destruction of this model
            for (var i = 0; i < this._all_entities.length; i++) {
                if (i !== index) {
                    this._all_entities[i].notify_model_destroyed(entity.model);
                }
            }
            // Unregister in the ID to object table
            this._label_model_obj_table.unregister(entity.model);
            delete this._label_model_id_to_entity[entity.model.object_id];
            // Remove
            this._all_entities.splice(index, 1);
        };
        ;
        /*
        Register and unregister root entities
         */
        RootLabelView.prototype._register_root_entity = function (entity) {
            this.root_entities.push(entity);
            entity.add_event_listener(this._entity_event_listener);
        };
        ;
        RootLabelView.prototype._unregister_root_entity = function (entity) {
            // Remove from list of root entities
            var index_in_roots = this.root_entities.indexOf(entity);
            if (index_in_roots === -1) {
                throw "Attempting to unregister root entity that is not in root_entities";
            }
            this.root_entities.splice(index_in_roots, 1);
            // Remove from selection if present
            var index_in_selection = this.selected_entities.indexOf(entity);
            if (index_in_selection !== -1) {
                entity.select(false);
                this.selected_entities.splice(index_in_selection, 1);
            }
            entity.remove_event_listener(this._entity_event_listener);
        };
        ;
        /*
        Initialise and shutdown entities
         */
        RootLabelView.prototype.initialise_entity = function (entity) {
            entity.attach();
        };
        ;
        RootLabelView.prototype.shutdown_entity = function (entity) {
            entity.detach();
        };
        ;
        /*
        Get entity for model ID
         */
        RootLabelView.prototype.get_entity_for_model_id = function (model_id) {
            return this._label_model_id_to_entity[model_id];
        };
        ;
        /*
        Get entity for model
         */
        RootLabelView.prototype.get_entity_for_model = function (model) {
            var model_id = ObjectIDTable.get_id(model);
            return this._label_model_id_to_entity[model_id];
        };
        ;
        /*
        Get or create entity for model
         */
        RootLabelView.prototype.get_or_create_entity_for_model = function (model) {
            var model_id = ObjectIDTable.get_id(model);
            if (model_id === null ||
                !this._label_model_id_to_entity.hasOwnProperty(model_id)) {
                var entity = new_entity_for_model(this, model);
                this.initialise_entity(entity);
            }
            else {
                return this._label_model_id_to_entity[model_id];
            }
        };
        ;
        /*
        Add entity:
        register the entity and add its label to the tool data model
         */
        RootLabelView.prototype.add_root_entity = function (entity, commit) {
            this.initialise_entity(entity);
            this._register_root_entity(entity);
            var labels = get_label_header_labels(this.model);
            labels = labels.concat([entity.model]);
            this.model = replace_label_header_labels(this.model, labels);
            if (commit) {
                this.root_listener.root_list_changed(this);
            }
        };
        ;
        /*
        Remove entity
        unregister the entity and remove its label from the tool data model
         */
        RootLabelView.prototype.remove_root_entity = function (entity, commit) {
            // Find the entity's index in the array
            var index = this._all_entities.indexOf(entity);
            if (index === -1) {
                throw "Attempting to remove root entity that is not in _all_entities";
            }
            // Unregister the entity
            this.shutdown_entity(entity);
            // Get the label model
            var labels = get_label_header_labels(this.model);
            // Remove the model from the label model array
            labels = labels.slice(0, index).concat(labels.slice(index + 1));
            // Replace the labels in the label header
            this.model = replace_label_header_labels(this.model, labels);
            if (commit) {
                // Commit changes
                this.root_listener.root_list_changed(this);
            }
        };
        ;
        return RootLabelView;
    })();
    /*
    Abstract tool
     */
    var AbstractTool = (function () {
        function AbstractTool(view) {
            this._view = view;
        }
        AbstractTool.prototype.on_init = function () {
        };
        ;
        AbstractTool.prototype.on_shutdown = function () {
        };
        ;
        AbstractTool.prototype.on_switch_in = function (pos) {
        };
        ;
        AbstractTool.prototype.on_switch_out = function (pos) {
        };
        ;
        AbstractTool.prototype.on_left_click = function (pos, event) {
        };
        ;
        AbstractTool.prototype.on_cancel = function (pos) {
        };
        ;
        AbstractTool.prototype.on_button_down = function (pos, event) {
        };
        ;
        AbstractTool.prototype.on_button_up = function (pos, event) {
        };
        ;
        AbstractTool.prototype.on_move = function (pos) {
            return false;
        };
        ;
        AbstractTool.prototype.on_drag = function (pos) {
            return false;
        };
        ;
        AbstractTool.prototype.on_wheel = function (pos, wheelDeltaX, wheelDeltaY) {
            return false;
        };
        ;
        AbstractTool.prototype.on_key_down = function (event) {
            return false;
        };
        ;
        AbstractTool.prototype.on_entity_mouse_in = function (entity) {
        };
        ;
        AbstractTool.prototype.on_entity_mouse_out = function (entity) {
        };
        ;
        return AbstractTool;
    })();
    /*
    Select entity tool
     */
    var SelectEntityTool = (function (_super) {
        __extends(SelectEntityTool, _super);
        function SelectEntityTool(view) {
            _super.call(this, view);
            this._highlighted_entities = [];
        }
        SelectEntityTool.prototype.on_init = function () {
            this._highlighted_entities = [];
        };
        ;
        SelectEntityTool.prototype.on_shutdown = function () {
            // Remove any hover
            var entity = this._get_current_entity();
            if (entity !== null) {
                entity.hover(false);
            }
        };
        ;
        SelectEntityTool.prototype.on_entity_mouse_in = function (entity) {
            var index = this._highlighted_entities.indexOf(entity);
            if (index === -1) {
                var prev = this._get_current_entity();
                this._highlighted_entities.push(entity);
                var cur = this._get_current_entity();
                SelectEntityTool._entity_stack_modified(prev, cur);
            }
        };
        ;
        SelectEntityTool.prototype.on_entity_mouse_out = function (entity) {
            var index = this._highlighted_entities.indexOf(entity);
            if (index !== -1) {
                var prev = this._get_current_entity();
                this._highlighted_entities.splice(index, 1);
                var cur = this._get_current_entity();
                SelectEntityTool._entity_stack_modified(prev, cur);
            }
        };
        ;
        SelectEntityTool.prototype.on_left_click = function (pos, event) {
            var entity = this._get_current_entity();
            if (entity !== null) {
                this._view.select_entity(entity, event.shiftKey, true);
            }
            else {
                if (!event.shiftKey) {
                    this._view.unselect_all_entities();
                }
            }
        };
        ;
        SelectEntityTool.prototype._get_current_entity = function () {
            return this._highlighted_entities.length !== 0 ? this._highlighted_entities[this._highlighted_entities.length - 1] : null;
        };
        ;
        SelectEntityTool._entity_stack_modified = function (prev, cur) {
            if (cur !== prev) {
                if (prev !== null) {
                    prev.hover(false);
                }
                if (cur !== null) {
                    cur.hover(true);
                }
            }
        };
        ;
        return SelectEntityTool;
    })(AbstractTool);
    /*
    Brush select entity tool
     */
    var BrushSelectEntityTool = (function (_super) {
        __extends(BrushSelectEntityTool, _super);
        function BrushSelectEntityTool(view) {
            _super.call(this, view);
            this._highlighted_entities = [];
            this._brush_radius = 10.0;
            this._brush_circle = null;
        }
        BrushSelectEntityTool.prototype.on_init = function () {
            this._highlighted_entities = [];
            this._brush_circle = this._view.world.append("circle");
            this._brush_circle.attr("r", this._brush_radius);
            this._brush_circle.attr("visibility", "hidden");
            this._brush_circle.style("fill", "rgba(128,0,0,0.05)");
            this._brush_circle.style("stroke-width", "1.0");
            this._brush_circle.style("stroke", "red");
        };
        ;
        BrushSelectEntityTool.prototype.on_shutdown = function () {
            this._brush_circle.remove();
            this._brush_circle = null;
            this._highlighted_entities = [];
        };
        ;
        BrushSelectEntityTool.prototype._get_entities_in_range = function (point) {
            var in_range = [];
            var entities = this._view.get_entities();
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                var dist = entity.distance_to_point(point);
                if (dist !== null) {
                    if (dist <= this._brush_radius) {
                        in_range.push(entity);
                    }
                }
            }
            return in_range;
        };
        ;
        BrushSelectEntityTool.prototype._highlight_entities = function (entities) {
            // Remove any hover
            for (var i = 0; i < this._highlighted_entities.length; i++) {
                this._highlighted_entities[i].hover(false);
            }
            this._highlighted_entities = entities;
            // Add hover
            for (var i = 0; i < this._highlighted_entities.length; i++) {
                this._highlighted_entities[i].hover(true);
            }
        };
        ;
        BrushSelectEntityTool.prototype.on_button_down = function (pos, event) {
            this._highlight_entities([]);
            var entities = this._get_entities_in_range(pos);
            for (var i = 0; i < entities.length; i++) {
                this._view.select_entity(entities[i], event.shiftKey || i > 0, false);
            }
            return true;
        };
        ;
        BrushSelectEntityTool.prototype.on_button_up = function (pos, event) {
            this._highlight_entities(this._get_entities_in_range(pos));
            return true;
        };
        ;
        BrushSelectEntityTool.prototype.on_move = function (pos) {
            this._highlight_entities(this._get_entities_in_range(pos));
            this._brush_circle.attr("cx", pos.x);
            this._brush_circle.attr("cy", pos.y);
            return true;
        };
        ;
        BrushSelectEntityTool.prototype.on_drag = function (pos) {
            var entities = this._get_entities_in_range(pos);
            for (var i = 0; i < entities.length; i++) {
                this._view.select_entity(entities[i], true, false);
            }
            this._brush_circle.attr("cx", pos.x);
            this._brush_circle.attr("cy", pos.y);
            return true;
        };
        ;
        BrushSelectEntityTool.prototype.on_wheel = function (pos, wheelDeltaX, wheelDeltaY) {
            this._brush_radius += wheelDeltaY * 0.1;
            this._brush_radius = Math.max(this._brush_radius, 1.0);
            this._brush_circle.attr("r", this._brush_radius);
            return true;
        };
        ;
        BrushSelectEntityTool.prototype.on_key_down = function (event) {
            var handled = false;
            if (event.keyCode == 219) {
                this._brush_radius -= 2.0;
                handled = true;
            }
            else if (event.keyCode == 221) {
                this._brush_radius += 2.0;
                handled = true;
            }
            if (handled) {
                this._brush_radius = Math.max(this._brush_radius, 1.0);
                this._brush_circle.attr("r", this._brush_radius);
            }
            return handled;
        };
        ;
        BrushSelectEntityTool.prototype.on_switch_in = function (pos) {
            this._highlight_entities(this._get_entities_in_range(pos));
            this._brush_circle.attr("visibility", "visible");
        };
        ;
        BrushSelectEntityTool.prototype.on_switch_out = function (pos) {
            this._highlight_entities([]);
            this._brush_circle.attr("visibility", "hidden");
        };
        ;
        return BrushSelectEntityTool;
    })(AbstractTool);
    /*
    Draw polygon tool
     */
    var DrawPolygonTool = (function (_super) {
        __extends(DrawPolygonTool, _super);
        function DrawPolygonTool(view, entity) {
            _super.call(this, view);
            this.entity = entity;
        }
        DrawPolygonTool.prototype.on_init = function () {
        };
        ;
        DrawPolygonTool.prototype.on_shutdown = function () {
        };
        ;
        DrawPolygonTool.prototype.on_switch_in = function (pos) {
            if (this.entity !== null) {
                this.add_point(pos);
            }
        };
        ;
        DrawPolygonTool.prototype.on_switch_out = function (pos) {
            if (this.entity !== null) {
                this.remove_last_point();
            }
        };
        ;
        DrawPolygonTool.prototype.on_cancel = function (pos) {
            if (this.entity !== null) {
                this.remove_last_point();
                var vertices = this.get_vertices();
                if (vertices.length == 1) {
                    this.destroy_entity();
                }
                else {
                    this.entity.commit();
                    this.entity = null;
                }
            }
            else {
                this._view.unselect_all_entities();
                this._view.view.set_current_tool(new SelectEntityTool(this._view));
            }
        };
        ;
        DrawPolygonTool.prototype.on_left_click = function (pos, event) {
            this.add_point(pos);
        };
        ;
        DrawPolygonTool.prototype.on_move = function (pos) {
            this.update_last_point(pos);
            return true;
        };
        ;
        DrawPolygonTool.prototype.create_entity = function () {
            var model = new_PolygonalLabelModel();
            var entity = new PolygonalLabelEntity(this._view, model);
            this.entity = entity;
            this._view.add_root_entity(entity, false);
            this._view.select_entity(entity, false, false);
        };
        ;
        DrawPolygonTool.prototype.destroy_entity = function () {
            this._view.remove_root_entity(this.entity, false);
            this.entity = null;
        };
        ;
        DrawPolygonTool.prototype.get_vertices = function () {
            return this.entity !== null ? this.entity.model.vertices : null;
        };
        ;
        DrawPolygonTool.prototype.update_poly = function () {
            if (this.entity !== null) {
                this.entity.update();
            }
        };
        ;
        DrawPolygonTool.prototype.add_point = function (pos) {
            var entity_is_new = false;
            if (this.entity === null) {
                this.create_entity();
                entity_is_new = true;
            }
            var vertices = this.get_vertices();
            if (entity_is_new) {
                // Add a duplicate vertex; this second vertex will follow the mouse
                vertices.push(pos);
            }
            vertices.push(pos);
            this.update_poly();
        };
        ;
        DrawPolygonTool.prototype.update_last_point = function (pos) {
            var vertices = this.get_vertices();
            if (vertices !== null) {
                vertices[vertices.length - 1] = pos;
                this.update_poly();
            }
        };
        ;
        DrawPolygonTool.prototype.remove_last_point = function () {
            var vertices = this.get_vertices();
            if (vertices !== null) {
                if (vertices.length > 0) {
                    vertices.splice(vertices.length - 1, 1);
                    this.update_poly();
                }
                if (vertices.length === 0) {
                    this.destroy_entity();
                }
            }
        };
        ;
        return DrawPolygonTool;
    })(AbstractTool);
    /*
    Labelling tool view; links to the server side data structures
     */
    var LabellingTool = (function () {
        function LabellingTool(element, label_classes, tool_width, tool_height, image_ids, initial_image_id, requestImageCallback, sendLabelHeaderFn, config) {
            var _this = this;
            var self = this;
            if (LabellingTool._global_key_handler === undefined ||
                LabellingTool._global_key_handler_connected === undefined) {
                LabellingTool._global_key_handler = null;
                LabellingTool._global_key_handler_connected = false;
            }
            config = config || {};
            this._config = config;
            config.tools = config.tools || {};
            ensure_flag_exists(config.tools, 'imageSelector', true);
            ensure_flag_exists(config.tools, 'labelClassSelector', true);
            ensure_flag_exists(config.tools, 'brushSelect', true);
            ensure_flag_exists(config.tools, 'drawPolyLabel', true);
            ensure_flag_exists(config.tools, 'compositeLabel', true);
            ensure_flag_exists(config.tools, 'groupLabel', true);
            ensure_flag_exists(config.tools, 'deleteLabel', true);
            /*
            Entity event listener
             */
            this._entity_event_listener = {
                on_mouse_in: function (entity) {
                    if (_this._current_tool !== null) {
                        _this._current_tool.on_entity_mouse_in(entity);
                    }
                },
                on_mouse_out: function (entity) {
                    if (_this._current_tool !== null) {
                        _this._current_tool.on_entity_mouse_out(entity);
                    }
                }
            };
            /*
            Root view listener
             */
            this.root_view_listener = {
                // Selection changed; update class selector dropdown
                on_selection_changed: function (root_view) {
                    _this._update_label_class_menu_from_views(root_view.get_selection());
                },
                // Root list changed; queue push
                root_list_changed: function (root_view) {
                    _this.queue_push_label_data();
                }
            };
            // Model
            var initial_model = {
                image_id: '',
                complete: false,
                labels: []
            };
            // Active tool
            this._current_tool = null;
            // Classes
            this.label_classes = label_classes;
            // Hide labels
            this.hide_labels = false;
            // Button state
            this._button_down = false;
            // Labelling tool dimensions
            this._tool_width = tool_width;
            this._tool_height = tool_height;
            // List of Image IDs
            this._image_ids = image_ids;
            // Number of images in dataset
            this._num_images = image_ids.length;
            // Image dimensions
            this._image_width = 0;
            this._image_height = 0;
            // Data request callback; labelling tool will call this when it needs a new image to show
            this._requestImageCallback = requestImageCallback;
            // Send data callback; labelling tool will call this when it wants to commit data to the backend in response
            // to user action
            this._sendLabelHeaderFn = sendLabelHeaderFn;
            // Send data interval for storing interval ID for queued label send
            this._pushDataTimeout = null;
            var toolbar_width = 220;
            this._labelling_area_width = this._tool_width - toolbar_width;
            var labelling_area_x_pos = toolbar_width + 10;
            // A <div> element that surrounds the labelling tool
            var overall_border = $('<div style="border: 1px solid gray; width: ' + this._tool_width + 'px;"/>')
                .appendTo(element);
            var toolbar_container = $('<div style="position: relative;">').appendTo(overall_border);
            var toolbar = $('<div style="position: absolute; width: ' + toolbar_width +
                'px; padding: 4px; display: inline-block; background: #d0d0d0; border: 1px solid #a0a0a0;"/>').appendTo(toolbar_container);
            var labelling_area = $('<div style="width:' + this._labelling_area_width + 'px; margin-left: ' + labelling_area_x_pos + 'px"/>').appendTo(overall_border);
            /*
             *
             *
             * TOOLBAR CONTENTS
             *
             *
             */
            //
            // IMAGE SELECTOR
            //
            $('<p style="background: #b0b0b0;">Current image</p>').appendTo(toolbar);
            if (config.tools.imageSelector) {
                var _change_image = function (image_id) {
                    self._requestImageCallback(image_id);
                };
                var _increment_image_index = function (offset) {
                    var image_id = self._get_current_image_id();
                    var index = self._image_id_to_index(image_id) + offset;
                    _change_image(self._image_index_to_id(index));
                };
                this._image_index_input = $('<input type="text" style="width: 30px; vertical-align: middle;" name="image_index"/>').appendTo(toolbar);
                this._image_index_input.on('change', function () {
                    var index_str = self._image_index_input.val();
                    var index = parseInt(index_str) - 1;
                    var image_id = self._image_index_to_id(index);
                    _change_image(image_id);
                });
                $('<span>' + '/' + this._num_images + '</span>').appendTo(toolbar);
                $('<br/>').appendTo(toolbar);
                var prev_image_button = $('<button>Prev image</button>').appendTo(toolbar);
                prev_image_button.button({
                    text: false,
                    icons: { primary: "ui-icon-seek-prev" }
                }).click(function (event) {
                    _increment_image_index(-1);
                    event.preventDefault();
                });
                var next_image_button = $('<button>Next image</button>').appendTo(toolbar);
                next_image_button.button({
                    text: false,
                    icons: { primary: "ui-icon-seek-next" }
                }).click(function (event) {
                    _increment_image_index(1);
                    event.preventDefault();
                });
            }
            $('<br/>').appendTo(toolbar);
            this._complete_checkbox = $('<input type="checkbox">Finished</input>').appendTo(toolbar);
            this._complete_checkbox.change(function (event, ui) {
                self.root_view.set_complete(event.target.checked);
                self.queue_push_label_data();
            });
            //
            // LABEL CLASS SELECTOR AND HIDE LABELS
            //
            $('<p style="background: #b0b0b0;">Labels</p>').appendTo(toolbar);
            if (config.tools.labelClassSelector) {
                this._label_class_selector_menu = $('<select name="label_class_selector"/>').appendTo(toolbar);
                for (var i = 0; i < this.label_classes.length; i++) {
                    var cls = this.label_classes[i];
                    $('<option value="' + cls.name + '">' + cls.human_name + '</option>').appendTo(this._label_class_selector_menu);
                }
                $('<option value="__unclassified" selected="false">UNCLASSIFIED</option>').appendTo(this._label_class_selector_menu);
                this._label_class_selector_menu.change(function (event, ui) {
                    var label_class_name = event.target.value;
                    if (label_class_name == '__unclassified') {
                        label_class_name = null;
                    }
                    var selection = self.root_view.get_selection();
                    for (var i = 0; i < selection.length; i++) {
                        selection[i].set_label_class(label_class_name);
                    }
                });
            }
            $('<br/>').appendTo(toolbar);
            var hide_labels_checkbox = $('<input type="checkbox">Hide labels</input>').appendTo(toolbar);
            hide_labels_checkbox.change(function (event, ui) {
                self.hide_labels = event.target.checked;
                self.root_view.set_label_visibility(!self.hide_labels);
            });
            //
            // Tool buttons:
            // Select, brush select, draw poly, composite, group, delete
            //
            $('<p style="background: #b0b0b0;">Tools</p>').appendTo(toolbar);
            var select_button = $('<button>Select</button>').appendTo(toolbar);
            select_button.button().click(function (event) {
                self.set_current_tool(new SelectEntityTool(self.root_view));
                event.preventDefault();
            });
            if (config.tools.brushSelect) {
                var brush_select_button = $('<button>Brush select</button>').appendTo(toolbar);
                brush_select_button.button().click(function (event) {
                    self.set_current_tool(new BrushSelectEntityTool(self.root_view));
                    event.preventDefault();
                });
            }
            if (config.tools.drawPolyLabel) {
                var draw_polygon_button = $('<button>Draw poly</button>').appendTo(toolbar);
                draw_polygon_button.button().click(function (event) {
                    var current = self.root_view.get_selected_entity();
                    if (current instanceof PolygonalLabelEntity) {
                        self.set_current_tool(new DrawPolygonTool(self.root_view, current));
                    }
                    else {
                        self.set_current_tool(new DrawPolygonTool(self.root_view, null));
                    }
                    event.preventDefault();
                });
            }
            if (config.tools.compositeLabel) {
                var composite_button = $('<button>Composite</button>').appendTo(toolbar);
                composite_button.button().click(function (event) {
                    self.root_view.create_composite_label_from_selection();
                    event.preventDefault();
                });
            }
            if (config.tools.groupLabel) {
                var group_button = $('<button>Group</button>').appendTo(toolbar);
                group_button.button().click(function (event) {
                    var group_entity = self.root_view.create_group_label_from_selection();
                    if (group_entity !== null) {
                        self.root_view.select_entity(group_entity, false, false);
                    }
                    event.preventDefault();
                });
            }
            if (config.tools.deleteLabel) {
                var delete_label_button = $('<button>Delete</button>').appendTo(toolbar);
                delete_label_button.button({
                    text: false,
                    icons: { primary: "ui-icon-trash" }
                }).click(function (event) {
                    if (!self._confirm_delete_visible) {
                        var cancel_button = $('<button>Cancel</button>').appendTo(self._confirm_delete);
                        var confirm_button = $('<button>Confirm delete</button>').appendTo(self._confirm_delete);
                        var remove_confirm_ui = function () {
                            cancel_button.remove();
                            confirm_button.remove();
                            self._confirm_delete_visible = false;
                        };
                        cancel_button.button().click(function (event) {
                            remove_confirm_ui();
                            event.preventDefault();
                        });
                        confirm_button.button().click(function (event) {
                            self.root_view.delete_selection();
                            remove_confirm_ui();
                            event.preventDefault();
                        });
                        self._confirm_delete_visible = true;
                    }
                    event.preventDefault();
                });
                this._confirm_delete = $('<span/>').appendTo(toolbar);
                this._confirm_delete_visible = false;
            }
            /*
             *
             * LABELLING AREA
             *
             */
            // Zoom callback
            function zoomed() {
                var zoom_event = d3.event;
                var t = zoom_event.translate, s = zoom_event.scale;
                self._zoom_xlat = t;
                self._zoom_scale = s;
                self._zoom_node.attr("transform", "translate(" + t[0] + "," + t[1] + ") scale(" + s + ")");
            }
            // Create d3.js panning and zooming behaviour
            var zoom_behaviour = d3.behavior.zoom()
                .on("zoom", zoomed);
            // Disable context menu so we can use right-click
            labelling_area[0].oncontextmenu = function () {
                return false;
            };
            // Create SVG element of the appropriate dimensions
            this._svg = d3.select(labelling_area[0])
                .append("svg:svg")
                .attr("width", this._labelling_area_width)
                .attr("height", this._tool_height)
                .call(zoom_behaviour);
            var svg = this._svg;
            // Add the zoom transformation <g> element
            this._zoom_node = this._svg.append('svg:g').attr('transform', 'scale(1)');
            this._zoom_scale = 1.0;
            this._zoom_xlat = [0.0, 0.0];
            // Create the container <g> element that will contain our scene
            this.world = this._zoom_node.append('g');
            // Add the image element to the container
            this._image = this.world.append("image")
                .attr("x", 0)
                .attr("y", 0);
            // Flag that indicates if the mouse pointer is within the tool area
            this._mouse_within = false;
            this._last_mouse_pos = null;
            // Create the root view
            this.root_view = new RootLabelView(initial_model, this.root_view_listener, this._entity_event_listener, this, this.world);
            //
            // Set up event handlers
            //
            // Click
            this.world.on("click", function () {
                var click_event = d3.event;
                if (click_event.button === 0) {
                    // Left click; send to tool
                    if (!click_event.altKey) {
                        if (_this._current_tool !== null) {
                            _this._current_tool.on_left_click(self.get_mouse_pos_world_space(), d3.event);
                        }
                        click_event.stopPropagation();
                    }
                }
            });
            // Button press
            this.world.on("mousedown", function () {
                var button_event = d3.event;
                if (button_event.button === 0) {
                    // Left button down
                    if (!button_event.altKey) {
                        self._button_down = true;
                        if (_this._current_tool !== null) {
                            _this._current_tool.on_button_down(self.get_mouse_pos_world_space(), d3.event);
                        }
                        button_event.stopPropagation();
                    }
                }
                else if (button_event.button === 2) {
                    // Right click; on_cancel current tool
                    if (_this._current_tool !== null) {
                        var handled = _this._current_tool.on_cancel(self.get_mouse_pos_world_space());
                        if (handled) {
                            button_event.stopPropagation();
                        }
                    }
                }
            });
            // Button press
            this.world.on("mouseup", function () {
                var button_event = d3.event;
                if (button_event.button === 0) {
                    // Left buton up
                    if (!button_event.altKey) {
                        self._button_down = false;
                        if (_this._current_tool !== null) {
                            _this._current_tool.on_button_up(self.get_mouse_pos_world_space(), d3.event);
                        }
                        button_event.stopPropagation();
                    }
                }
            });
            // Mouse on_move
            this.world.on("mousemove", function () {
                var move_event = d3.event;
                self._last_mouse_pos = self.get_mouse_pos_world_space();
                if (self._button_down) {
                    if (_this._current_tool !== null) {
                        _this._current_tool.on_drag(self._last_mouse_pos);
                    }
                    move_event.stopPropagation();
                }
                else {
                    var handled = false;
                    if (!self._mouse_within) {
                        self._init_key_handlers();
                        // Entered tool area; invoke tool.on_switch_in()
                        if (_this._current_tool !== null) {
                            _this._current_tool.on_switch_in(self._last_mouse_pos);
                            handled = true;
                        }
                        self._mouse_within = true;
                    }
                    else {
                        // Send mouse on_move event to tool
                        if (_this._current_tool !== null) {
                            _this._current_tool.on_move(self._last_mouse_pos);
                            handled = true;
                        }
                    }
                    if (handled) {
                        move_event.stopPropagation();
                    }
                }
            });
            // Mouse wheel
            this.world.on("mousewheel", function () {
                var wheel_event = d3.event;
                var handled = false;
                self._last_mouse_pos = self.get_mouse_pos_world_space();
                if (wheel_event.ctrlKey || wheel_event.shiftKey || wheel_event.altKey) {
                    if (_this._current_tool !== null) {
                        handled = _this._current_tool.on_wheel(self._last_mouse_pos, wheel_event.wheelDeltaX, wheel_event.wheelDeltaY);
                    }
                }
                if (handled) {
                    wheel_event.stopPropagation();
                }
            });
            var on_mouse_out = function (pos, width, height) {
                var mouse_event = d3.event;
                if (self._mouse_within) {
                    if (pos.x < 0.0 || pos.x > width || pos.y < 0.0 || pos.y > height) {
                        // The pointer is outside the bounds of the tool, as opposed to entering another element within the bounds of the tool, e.g. a polygon
                        // invoke tool.on_switch_out()
                        var handled = false;
                        if (_this._current_tool !== null) {
                            _this._current_tool.on_switch_out(self.get_mouse_pos_world_space());
                            handled = true;
                        }
                        if (handled) {
                            mouse_event.stopPropagation();
                        }
                        self._mouse_within = false;
                        self._last_mouse_pos = null;
                        self._shutdown_key_handlers();
                    }
                }
            };
            // Mouse leave
            this._svg.on("mouseout", function () {
                on_mouse_out(_this.get_mouse_pos_screen_space(), _this._labelling_area_width, _this._tool_height);
            });
            // Global key handler
            if (!LabellingTool._global_key_handler_connected) {
                d3.select("body").on("keydown", function () {
                    if (LabellingTool._global_key_handler !== null) {
                        var key_event = d3.event;
                        var handled = LabellingTool._global_key_handler(key_event);
                        if (handled) {
                            key_event.stopPropagation();
                        }
                    }
                });
                LabellingTool._global_key_handler_connected = true;
            }
            // Create entities for the pre-existing labels
            this._requestImageCallback(initial_image_id);
        }
        ;
        LabellingTool.prototype._image_id_to_index = function (image_id) {
            var image_index = this._image_ids.indexOf(image_id);
            if (image_index === -1) {
                console.log("Image ID " + image_id + " not found");
                image_index = 0;
            }
            return image_index;
        };
        ;
        LabellingTool.prototype._image_index_to_id = function (index) {
            var clampedIndex = Math.max(Math.min(index, this._image_ids.length - 1), 0);
            console.log("index=" + index + ", clampedIndex=" + clampedIndex);
            return this._image_ids[clampedIndex];
        };
        ;
        LabellingTool.prototype._update_image_index_input = function (image_id) {
            var image_index = this._image_id_to_index(image_id);
            this._image_index_input.val((image_index + 1).toString());
        };
        ;
        LabellingTool.prototype._get_current_image_id = function () {
            return this.root_view.get_current_image_id();
        };
        ;
        LabellingTool.prototype.setImage = function (image_data) {
            // Update the image SVG element
            this._image.attr("width", image_data.width + 'px');
            this._image.attr("height", image_data.height + 'px');
            this._image.attr('xlink:href', image_data.href);
            this._image_width = image_data.width;
            this._image_height = image_data.height;
            this.root_view.set_model(image_data.label_header);
            this._complete_checkbox[0].checked = this.root_view.model.complete;
            this._update_image_index_input(this.root_view.model.image_id);
            this.set_current_tool(new SelectEntityTool(this.root_view));
            console.log(this);
        };
        ;
        /*
        Get colour for a given label class
         */
        LabellingTool.prototype.index_for_label_class = function (label_class) {
            if (label_class != null) {
                for (var i = 0; i < this.label_classes.length; i++) {
                    var cls = this.label_classes[i];
                    if (cls.name === label_class) {
                        return i;
                    }
                }
            }
            // Default
            return -1;
        };
        ;
        LabellingTool.prototype.colour_for_label_class = function (label_class) {
            var index = this.index_for_label_class(label_class);
            if (index !== -1) {
                return this.label_classes[index].colour;
            }
            else {
                // Default
                return [0, 0, 0];
            }
        };
        ;
        LabellingTool.prototype._update_label_class_menu = function (label_class) {
            if (label_class === null) {
                label_class = '__unclassified';
            }
            this._label_class_selector_menu.children('option').each(function () {
                this.selected = (this.value == label_class);
            });
        };
        ;
        LabellingTool.prototype._update_label_class_menu_from_views = function (selection) {
            if (selection.length === 1) {
                this._update_label_class_menu(selection[0].model.label_class);
            }
            else {
                this._update_label_class_menu(null);
            }
        };
        ;
        /*
        Set the current tool; switch the old one out and a new one in
         */
        LabellingTool.prototype.set_current_tool = function (tool) {
            if (this._current_tool !== null) {
                if (this._mouse_within) {
                    this._current_tool.on_switch_out(this._last_mouse_pos);
                }
                this._current_tool.on_shutdown();
            }
            this._current_tool = tool;
            if (this._current_tool !== null) {
                this._current_tool.on_init();
                if (this._mouse_within) {
                    this._current_tool.on_switch_in(this._last_mouse_pos);
                }
            }
        };
        ;
        LabellingTool.prototype.queue_push_label_data = function () {
            var _this = this;
            if (this._pushDataTimeout === null) {
                this._pushDataTimeout = setTimeout(function () {
                    _this._pushDataTimeout = null;
                    _this._sendLabelHeaderFn(_this.root_view.model);
                }, 0);
            }
        };
        ;
        // Function for getting the current mouse position
        LabellingTool.prototype.get_mouse_pos_world_space = function () {
            var pos_screen = d3.mouse(this._svg[0][0]);
            return { x: (pos_screen[0] - this._zoom_xlat[0]) / this._zoom_scale,
                y: (pos_screen[1] - this._zoom_xlat[1]) / this._zoom_scale };
        };
        ;
        LabellingTool.prototype.get_mouse_pos_screen_space = function () {
            var pos = d3.mouse(this._svg[0][0]);
            return { x: pos[0], y: pos[1] };
        };
        ;
        LabellingTool.prototype._init_key_handlers = function () {
            var self = this;
            var on_key_down = function (event) {
                return self._on_key_down(event);
            };
            LabellingTool._global_key_handler = on_key_down;
        };
        ;
        LabellingTool.prototype._shutdown_key_handlers = function () {
            LabellingTool._global_key_handler = null;
        };
        ;
        LabellingTool.prototype._on_key_down = function (event) {
            if (this._current_tool !== null && this._mouse_within) {
                return this._current_tool.on_key_down(event);
            }
            else {
                return false;
            }
        };
        return LabellingTool;
    })();
    labelling_tool.LabellingTool = LabellingTool;
})(labelling_tool || (labelling_tool = {}));
//# sourceMappingURL=labelling_tool.js.map