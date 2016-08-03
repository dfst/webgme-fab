define([
    './js/velocity.min',
    './js/hammer.min',
    './js/buttons'
], function(
    Vel,
    Hammer
) {

    // Materialize "globals"
    var Materialize = {};

    // Unique ID
    Materialize.guid = (function() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
               s4() + '-' + s4() + s4() + s4();
      };
    })();

    Materialize.elementOrParentIsFixed = function(element) {
        var $element = $(element);
        var $checkElements = $element.add($element.parents());
        var isFixed = false;
        $checkElements.each(function(){
            if ($(this).css("position") === "fixed") {
                isFixed = true;
                return false;
            }
        });
        return isFixed;
    };

    // Materialize toasts
    Materialize.toast = function (message, displayLength, className, completeCallback) {
        className = className || "";

        var container = document.getElementById('toast-container');

        // Create toast container if it does not exist
        if (container === null) {
            // create notification container
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        // Select and append toast
        var newToast = createToast(message);

        // only append toast if message is not undefined
        if(message){
            container.appendChild(newToast);
        }

        newToast.style.top = '35px';
        newToast.style.opacity = 0;

        // Animate toast in
        Vel(newToast, { "top" : "0px", opacity: 1 }, {duration: 300,
          easing: 'easeOutCubic',
          queue: false});

        // Allows timer to be pause while being panned
        var timeLeft = displayLength;
        var counterInterval = setInterval (function(){


          if (newToast.parentNode === null)
            window.clearInterval(counterInterval);

          // If toast is not being dragged, decrease its time remaining
          if (!newToast.classList.contains('panning')) {
            timeLeft -= 20;
          }

          if (timeLeft <= 0) {
            // Animate toast out
            Vel(newToast, {"opacity": 0, marginTop: '-40px'}, { duration: 375,
                easing: 'easeOutExpo',
                queue: false,
                complete: function(){
                  // Call the optional callback
                  if(typeof(completeCallback) === "function")
                    completeCallback();
                  // Remove toast after it times out
                  this[0].parentNode.removeChild(this[0]);
                }
              });
            window.clearInterval(counterInterval);
          }
        }, 20);



        function createToast(html) {

            // Create toast
            var toast = document.createElement('div');
            toast.classList.add('toast');
            if (className) {
                var classes = className.split(' ');

                for (var i = 0, count = classes.length; i < count; i++) {
                    toast.classList.add(classes[i]);
                }
            }
            // If type of parameter is HTML Element
            if ( typeof HTMLElement === "object" ? html instanceof HTMLElement : html && typeof html === "object" && html !== null && html.nodeType === 1 && typeof html.nodeName==="string"
    ) {
              toast.appendChild(html);
            }
            else if (html instanceof jQuery) {
              // Check if it is jQuery object
              toast.appendChild(html[0]);
            }
            else {
              // Insert as text;
              toast.innerHTML = html; 
            }
            // Bind hammer
            var hammerHandler = new Hammer(toast, {prevent_default: false});
            hammerHandler.on('pan', function(e) {
              var deltaX = e.deltaX;
              var activationDistance = 80;

              // Change toast state
              if (!toast.classList.contains('panning')){
                toast.classList.add('panning');
              }

              var opacityPercent = 1-Math.abs(deltaX / activationDistance);
              if (opacityPercent < 0)
                opacityPercent = 0;

              Vel(toast, {left: deltaX, opacity: opacityPercent }, {duration: 50, queue: false, easing: 'easeOutQuad'});

            });

            hammerHandler.on('panend', function(e) {
              var deltaX = e.deltaX;
              var activationDistance = 80;

              // If toast dragged past activation point
              if (Math.abs(deltaX) > activationDistance) {
                Vel(toast, {marginTop: '-40px'}, { duration: 375,
                    easing: 'easeOutExpo',
                    queue: false,
                    complete: function(){
                      if(typeof(completeCallback) === "function") {
                        completeCallback();
                      }
                      toast.parentNode.removeChild(toast);
                    }
                });

              } else {
                toast.classList.remove('panning');
                // Put toast back into original position
                Vel(toast, { left: 0, opacity: 1 }, { duration: 300,
                  easing: 'easeOutExpo',
                  queue: false
                });

              }
            });

            return toast;
        }
    };

    // tooltips
    (function ($) {
        $.fn.tooltip = function (options) {
            var timeout = null,
            counter = null,
            started = false,
            counterInterval = null,
            margin = 5;

          // Defaults
          var defaults = {
            delay: 350
          };

          // Remove tooltip from the activator
          if (options === "remove") {
            this.each(function(){
              $('#' + $(this).attr('data-tooltip-id')).remove();
            });
            return false;
          }

          options = $.extend(defaults, options);


          return this.each(function(){
            var tooltipId = Materialize.guid();
            var origin = $(this);
            origin.attr('data-tooltip-id', tooltipId);

            // Create Text span
            var tooltip_text = $('<span></span>').text(origin.attr('data-tooltip'));

            // Create tooltip
            var newTooltip = $('<div></div>');
            newTooltip.addClass('material-tooltip').append(tooltip_text)
              .appendTo($('body'))
              .attr('id', tooltipId);

            var backdrop = $('<div></div>').addClass('backdrop');
            backdrop.appendTo(newTooltip);
            backdrop.css({ top: 0, left:0 });


           //Destroy previously binded events
          origin.off('mouseenter.tooltip mouseleave.tooltip');
            // Mouse In
          origin.on({
            'mouseenter.tooltip': function(e) {
              var tooltip_delay = origin.data("delay");
              tooltip_delay = (tooltip_delay === undefined || tooltip_delay === '') ? options.delay : tooltip_delay;
              counter = 0;
              counterInterval = setInterval(function(){
                counter += 10;
                if (counter >= tooltip_delay && started === false) {
                  started = true;
                  newTooltip.css({ display: 'block', left: '0px', top: '0px' });

                  // Set Tooltip text
                  newTooltip.children('span').text(origin.attr('data-tooltip'));

                  // Tooltip positioning
                  var originWidth = origin.outerWidth();
                  var originHeight = origin.outerHeight();
                  var tooltipPosition =  origin.attr('data-position');
                  var tooltipHeight = newTooltip.outerHeight();
                  var tooltipWidth = newTooltip.outerWidth();
                  var tooltipVerticalMovement = '0px';
                  var tooltipHorizontalMovement = '0px';
                  var scale_factor = 8;

                  if (tooltipPosition === "top") {
                  // Top Position
                  newTooltip.css({
                    top: origin.offset().top - tooltipHeight - margin,
                    left: origin.offset().left + originWidth/2 - tooltipWidth/2
                  });
                  tooltipVerticalMovement = '-10px';
                  backdrop.css({
                    borderRadius: '14px 14px 0 0',
                    transformOrigin: '50% 90%',
                    marginTop: tooltipHeight,
                    marginLeft: (tooltipWidth/2) - (backdrop.width()/2)

                  });
                  }
                  // Left Position
                  else if (tooltipPosition === "left") {
                    newTooltip.css({
                      top: origin.offset().top + originHeight/2 - tooltipHeight/2,
                      left: origin.offset().left - tooltipWidth - margin
                    });
                    tooltipHorizontalMovement = '-10px';
                    backdrop.css({
                      width: '14px',
                      height: '14px',
                      borderRadius: '14px 0 0 14px',
                      transformOrigin: '95% 50%',
                      marginTop: tooltipHeight/2,
                      marginLeft: tooltipWidth
                    });
                  }
                  // Right Position
                  else if (tooltipPosition === "right") {
                    newTooltip.css({
                      top: origin.offset().top + originHeight/2 - tooltipHeight/2,
                      left: origin.offset().left + originWidth + margin
                    });
                    tooltipHorizontalMovement = '+10px';
                    backdrop.css({
                      width: '14px',
                      height: '14px',
                      borderRadius: '0 14px 14px 0',
                      transformOrigin: '5% 50%',
                      marginTop: tooltipHeight/2,
                      marginLeft: '0px'
                    });
                  }
                  else {
                    // Bottom Position
                    newTooltip.css({
                      top: origin.offset().top + origin.outerHeight() + margin,
                      left: origin.offset().left + originWidth/2 - tooltipWidth/2
                    });
                    tooltipVerticalMovement = '+10px';
                    backdrop.css({
                      marginLeft: (tooltipWidth/2) - (backdrop.width()/2)
                    });
                  }

                  // Calculate Scale to fill
                  scale_factor = tooltipWidth / 8;
                  if (scale_factor < 8) {
                    scale_factor = 8;
                  }
                  if (tooltipPosition === "right" || tooltipPosition === "left") {
                    scale_factor = tooltipWidth / 10;
                    if (scale_factor < 6)
                      scale_factor = 6;
                  }

                  newTooltip.velocity({ marginTop: tooltipVerticalMovement, marginLeft: tooltipHorizontalMovement}, { duration: 350, queue: false })
                    .velocity({opacity: 1}, {duration: 300, delay: 50, queue: false});
                  backdrop.css({ display: 'block' })
                  .velocity({opacity:1},{duration: 55, delay: 0, queue: false})
                  .velocity({scale: scale_factor}, {duration: 300, delay: 0, queue: false, easing: 'easeInOutQuad'});

                }
              }, 10); // End Interval

            // Mouse Out
            },
            'mouseleave.tooltip': function(){
              // Reset State
              clearInterval(counterInterval);
              counter = 0;

              // Animate back
              newTooltip.velocity({
                opacity: 0, marginTop: 0, marginLeft: 0}, { duration: 225, queue: false, delay: 225 }
              );
              backdrop.velocity({opacity: 0, scale: 1}, {
                duration:225,
                delay: 275, queue: false,
                complete: function(){
                  backdrop.css('display', 'none');
                  newTooltip.css('display', 'none');
                  started = false;}
              });
            }
            });
        });
      };

      $(document).ready(function(){
         $('.tooltipped').tooltip();
       });
    }( jQuery ));

    return Materialize;
});
