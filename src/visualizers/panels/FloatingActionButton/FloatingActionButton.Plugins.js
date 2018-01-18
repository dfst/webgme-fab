/*globals WebGMEGlobal*/
define([
    'js/Constants',
    'js/RegistryKeys',
    './styles/Materialize',
    'js/Dialogs/PluginResults/PluginResultsDialog'
], function(
    CONSTANTS,
    REGISTRY_KEYS,
    Materialize,
    PluginResultsDialog
) {
    'use strict';
    
    var RESULTS_NAME = 'View Results';
    var ActionButtonPlugins = function() {
        this.results = [];
        this._validPlugins = [];
        this._currentPlugins = [];
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
                    var message = result.pluginName + ' execution ' +
                        (result.success ? 'successful' : 'failed');

                    if (result.error) {
                        message += ': ' + result.error;
                    }

                    Materialize.toast(message, 5000);
                    // TODO: allow click to view results from the toast
                    result.__unread = true;
                    self.results.push(result);
                    //self._newResults = true;
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

        this._updatePluginBtns();
    };


    ActionButtonPlugins.prototype._updatePluginBtns = function() {
        var oldPlugins = this._currentPlugins,
            pluginStyle,
            pluginId,
            name,
            i;

        // TODO: This could be optimized
        // Remove the old plugins
        for (i = oldPlugins.length; i--;) {
            pluginId = oldPlugins[i];
            name = WebGMEGlobal.allPluginsMetadata[pluginId].name;
            delete this.buttons[name];
        }

        // Add the plugins to the buttons list
        for (i = this._validPlugins.length; i--;) {
            pluginId = this._validPlugins[i];
            if (!WebGMEGlobal.allPluginsMetadata[pluginId]) {
                this.logger.warn(`Found invalid pluginId (${pluginId}). Ignoring...`);
                this._validPlugins.splice(i, 1);
            } else {
                name = WebGMEGlobal.allPluginsMetadata[pluginId].name;
                pluginStyle = this._config.pluginUIConfigs[pluginId] || {};
                pluginStyle.action = this.getPluginFn(pluginId);

                // Set the style
                this.buttons[name] = pluginStyle;
            }
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
