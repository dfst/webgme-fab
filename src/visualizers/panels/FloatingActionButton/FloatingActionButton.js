/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/

define([
    // Add the css for this button
    'js/Constants',
    'js/RegistryKeys',
    'js/PanelBase/PanelBase',
    './FloatingActionButton.Plugins',
    'js/Utils/ComponentSettings',
    'text!./templates/PluginButton.html.ejs',
    'text!./templates/PluginAnchor.html.ejs',
    'text!./templates/NoPlugins.html',

    // Extra js and css for the button
    './styles/js/hammer.min',
    './styles/js/velocity.min',
    './styles/js/global',
    './styles/js/buttons',
    './styles/js/toasts',
    './styles/js/tooltip',
    'css!./styles/css/floating-action-btn.css',
    'css!./styles/css/icons.css',
], function (
    CONSTANTS,
    REGISTRY_KEYS,
    PanelBase,
    ActionBtnPlugins,
    ComponentSettings,
    PluginBtnTemplateText,
    PluginTemplateText,
    NoPluginHtml,
    Hammer,
    Vel
) {
    'use strict';

    // FIXME: There is a better way to give materialize access to Hammer and Vel
    // in the global scope
    window.Hammer = Hammer;
    window.Vel = Vel;
    var PluginButton,
        PluginTemplate = _.template(PluginTemplateText),
        PluginBtnTemplate = _.template(PluginBtnTemplateText),
        DEFAULT_ICON = 'play_arrow',
        DEFAULT_STYLE = {
            priority: 0
        };

    // I need to extend this so I can support custom actions that do not
    // use a plugin.
    // TODO
    //
    // The button needs to have an action name and function. Plugins will have // a stock function to use (results will also be refactored).
    //
    // TODO:
    //  + Refactor the actions to lookup and call a function
    //  + Where should I put the actions?
    PluginButton = function (layoutManager, params) {
        var options = {};

        //initialize UI
        PanelBase.call(this);
        this.client = params.client;
        this.currentPlugins = [];
        this._validPlugins = [];

        this.buttons = {};  // name -> function
        this._currentButtons = [];

        this._config = {
            hideOnEmpty: true
        };
        ComponentSettings.resolveWithWebGMEGlobal(this._config, PluginButton.getComponentId());

        ActionBtnPlugins.call(this);
        this._initialize();

        this.logger.debug('ctor finished');
    };

    _.extend(PluginButton.prototype, PanelBase.prototype);

    PluginButton.getComponentId = function () {
        return 'FloatingActionButton';
    };

    PluginButton.prototype._needsUpdate = function () {
        // Check if the buttons have changed
        var actionNames = Object.keys(this.buttons);
        return !this._currentButtons.length ||  // No actions
            actionNames.length !== this._currentButtons.length ||
            _.difference(actionNames, this._currentButtons).length;
    };

    PluginButton.prototype.update = function () {
        if (this._needsUpdate()) {
            this._updateButton();
        }
    };

    PluginButton.prototype._clearHtml = function () {
        this.$el.find('.tooltipped').tooltip('remove');
        this.$el.empty();
    };

    PluginButton.prototype._updateButton = function () {
        // Create the html elements
        var html;

        // Update the html
        this._clearHtml();
        html = this._createButtonHtml();
        if (html) {
            this.$el.append(html);

            // Set the onclick for the action buttons
            var anchors = [],
                child,
                container = html[0],
                listElement;

            for (var i = container.children.length; i--;) {
                child = container.children[i];
                if (child.tagName.toLowerCase() === 'a') {
                    anchors.push(child);
                } else {  // ul element
                    for (var k = child.children.length; k--;) {
                        listElement = child.children[k].children[0];
                        if (listElement) {
                            anchors.push(listElement);
                        }
                    }
                }
            }

            // Add onclick listener
            anchors
                .forEach(anchor => {
                    var name = anchor.getAttribute('data-tooltip');
                    anchor.onclick = this._onButtonClicked.bind(this, name);
                });
            this.$el.find('.tooltipped').tooltip({delay: 50});
        }
    };

    PluginButton.prototype._initialize = function () {
        // Add listener for object changed and update the button
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT,
            (model, nodeId) => this.selectedObjectChanged(nodeId));
        // TODO: Do I need a destructor for this?
        // TODO: I should check to see how this updates when the validPlugins
        // gets updated. It may require a refresh of the active node currently
    };

    PluginButton.prototype.TERRITORY_RULE = {children: 0};
    PluginButton.prototype.selectedObjectChanged = function(nodeId) {
        if (this._territoryId) {
            this.client.removeUI(this._territoryId);
        }

        if (typeof nodeId === 'string') {
            this._territoryId = this.client.addUI(this, events => {
                this._eventCallback(events);
            });

            this._currentNodeId = nodeId;
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = this.TERRITORY_RULE;
            this.client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    PluginButton.prototype._eventCallback = function(events) {
        var event = events.find(e => e.eid === this._currentNodeId);

        if (event && (event.etype === CONSTANTS.TERRITORY_EVENT_LOAD ||
            event.etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {
            this.onNodeLoad(event.eid);
        }
    };

    PluginButton.prototype._createButtonHtml = function () {
        var actions = [],
            colors = ['red', 'blue', 'yellow darken-1', 'green'],
            actionNames,
            html,
            names,
            action;

        // Get the actions
        actionNames = Object.keys(this.buttons);
        names = actionNames
            // Remove all buttons that don't have an action or href
            .filter(name => this.buttons[name].action ||
                typeof this.buttons[name].href === 'string'||
                this.buttons[name].href.call(this)
            )
            // Sort by priority
            .map(name => {
                return {
                    name,
                    priority: this.buttons[name].priority || 0
                };
            })
            .sort((a, b) => a.priority > b.priority)
            .map(obj => obj.name);

        if (names.length) {
            names.unshift(names.pop());
        }

        // Create the html for each
        for (var i = 0; i < names.length; i++) {
            action = this.buttons[names[i]];
            actions.push(PluginTemplate({
                name: names[i],
                icon: action.icon || DEFAULT_ICON,
                color: action.color || (i === 0 ? colors[i] :
                    colors[(names.length-i) % colors.length]),
                // Add href if appropriate
                href: action.href ? action.href.call(this) : null
            }));
        }

        if (actions.length > 0) {
            html = PluginBtnTemplate({plugins: actions});
            return $(html);
        } else if (this._config.hideOnEmpty) {
            return null;
        } else {
            return $(NoPluginHtml);
        }

        this._currentButtons = names;
    };

    PluginButton.prototype._onButtonClicked = function (name) {
        // Look up the function and invoke it
        if (this.buttons[name].action) {
            this.buttons[name].action.call(this, event);
        }
    };

    _.extend(PluginButton.prototype, ActionBtnPlugins.prototype);

    return PluginButton;
});
