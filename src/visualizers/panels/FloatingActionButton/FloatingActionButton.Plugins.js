/*globals WebGMEGlobal*/
define([
    'js/Constants',
    'js/RegistryKeys',
    'js/Dialogs/PluginResults/PluginResultsDialog'
], function(
    CONSTANTS,
    REGISTRY_KEYS,
    PluginResultsDialog
) {
    'use strict';
    
    var RESULTS_NAME = 'View Results';
    var ActionButtonPlugins = function() {
        this.results = [];
        this._validPlugins = [];
        this._currentPlugins = [];
        this._pluginConfig = {};
        this._newResults = false;
        this._territoryId = null;
    };

    ActionButtonPlugins.prototype._invokePlugin = function (name) {
        var self = this,
		    metadata;
        if (name) {
            metadata = WebGMEGlobal.allPluginsMetadata[name];
            WebGMEGlobal.InterpreterManager.configureAndRun(metadata, function(result) {
                if (result) {  // not cancelled
                    // Create the toast
                    Materialize.toast(result.pluginName + ' execution ' + (result.success ?
                        'successful' : 'failed') + '.', 5000);
                    // TODO: allow click to view results from the toast
                    result.__unread = true;
                    self.results.push(result);
                    //self._newResults = true;
                    // TODO: Increase the priority of the result until it is viewed?
                    self._updatePluginBtns();
                }
            });
        }
    };

    ActionButtonPlugins.prototype.getPluginFn = function (name) {
        return this._invokePlugin.bind(this, name);
    };

    ActionButtonPlugins.prototype.pluginResultsFn = function () {
        var dialog = new PluginResultsDialog();
        dialog.show(this.client, this.results);

        // Set all the results '__unread' to false
        this.results.forEach(function(result) {
            result.__unread = false;
        });
    };

    ActionButtonPlugins.prototype._initialize = function () {
        // Add listener for object changed and update the button
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT,
            (model, nodeId) => this.selectedObjectChanged(nodeId));
        // TODO: Do I need a destructor for this?
        // TODO: I should check to see how this updates when the validPlugins
        // gets updated. It may require a refresh of the active node currently
    };

    ActionButtonPlugins.prototype.TERRITORY_RULE = {children: 0};
    ActionButtonPlugins.prototype.selectedObjectChanged = function(nodeId) {
        if (this._territoryId) {
            this.client.removeUI(this._territoryId);
        }

        if (typeof nodeId === 'string') {
            this._territoryId = this.client.addUI(this, events => {
                this._eventCallback(events);
            });

            this._selfPatterns = {};
            this._selfPatterns[nodeId] = this.TERRITORY_RULE;
            this.client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    ActionButtonPlugins.prototype._eventCallback = function(events) {
        var event = events.find(e => e.etype === CONSTANTS.TERRITORY_EVENT_LOAD),
            currentId = event ? event.eid : null;

        if (event) {
            this.onNodeLoad(event.eid);
        }
    };

    ActionButtonPlugins.prototype.onNodeLoad = function (nodeId) {
        var node = this.client.getNode(nodeId),
            rawPluginRegistry = '',
            plugin;

        if (node) {
            rawPluginRegistry = node.getRegistry(REGISTRY_KEYS.VALID_PLUGINS) || '';
        } else {
            this.logger.warn('node is ' + node);
        }

        // Get the valid plugins for the node
        this._validPlugins = rawPluginRegistry.split(' ')
            .filter(entry => !!entry);

        this._currentNodeId = nodeId;

        $('.tooltipped').tooltip('remove');  // Clear any existing tooltips
        this._updatePluginBtns();
        $('.tooltipped').tooltip({delay: 50});  // Refresh tooltips
    };


    ActionButtonPlugins.prototype._updatePluginBtns = function() {
        var oldPlugins = this._currentPlugins,
            pluginStyle,
            plugin,
            i;

        // TODO: This could be optimized
        // Remove the old plugins
        for (i = oldPlugins.length; i--;) {
            delete this.buttons[oldPlugins[i]];
        }

        // Add the plugins to the buttons list
        for (i = this._validPlugins.length; i--;) {
            plugin = this._validPlugins[i];
            pluginStyle = this._pluginConfig[plugin] || {};
            pluginStyle.action = this.getPluginFn(plugin);

            // Set the style
            this.buttons[plugin] = pluginStyle;
        }

        // Add results if necessary
        if (this.results.length) {
            this.buttons[RESULTS_NAME] = {
                action: this.pluginResultsFn.bind(this),
                icon: 'list',
                color: 'grey',
                priority: this._newResults ? 100000 : -100000
            };
        }

        this._currentPlugins = this._validPlugins;

        // Update the button
        this.update();
    };

    return ActionButtonPlugins;
});
