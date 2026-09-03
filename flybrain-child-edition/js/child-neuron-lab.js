/* Child-facing explanation layer.
 * This does not alter the simulation: it translates the existing controls and
 * behaviour state into a short, inspectable stimulus → brain → behaviour story.
 */
(function () {
    'use strict';

    var paths = {
        feed: ['Food', 'Smell / taste', 'Brain network', 'Eating'],
        flower: ['Flower', 'Smell / taste', 'Brain network', 'Eating'],
        touch: ['Touch', 'Touch sensors', 'Brain network', 'Grooming or escape'],
        air: ['Moving air', 'Air / movement sensors', 'Brain network', 'Bracing or flying'],
        light: ['Light', 'Eye sensors', 'Brain network', 'Turning or walking'],
        temp: ['Temperature', 'Temperature sensors', 'Brain network', 'Activity level']
    };
    var friendlyBehaviours = {
        idle: 'waiting', walk: 'walking', explore: 'exploring', phototaxis: 'following light',
        feed: 'eating', groom: 'grooming', brace: 'bracing', fly: 'flying',
        startle: 'startled', rest: 'resting'
    };
    var prompt = document.getElementById('neuron-lab-prompt');
    var path = document.getElementById('neuron-path');
    var result = document.getElementById('neuron-lab-result');
    var source = document.getElementById('neuron-lab-source');

    function showPath(kind) {
        var items = paths[kind];
        if (!items) return;
        var html = '';
        for (var i = 0; i < items.length; i++) {
            if (i) html += '<b aria-hidden="true">→</b>';
            html += '<span>' + items[i] + '</span>';
        }
        path.innerHTML = html;
        prompt.textContent = 'Prediction: what will the fly do when this signal reaches its movement system?';
    }

    function refresh() {
        if (typeof BRAIN === 'undefined') return;
        var state = (typeof behavior !== 'undefined' && behavior.current) ? behavior.current : 'idle';
        result.innerHTML = 'The fly is <strong>' + (friendlyBehaviours[state] || state) + '</strong>.';
        if (BRAIN.workerReady) {
            source.textContent = 'Data note: real fly wiring is running underneath. This activity groups it into about 60 easy-to-watch pathways.';
        } else {
            source.textContent = 'Data note: this is the simplified learning model while the larger data set loads.';
        }
    }

    document.addEventListener('click', function (event) {
        var button = event.target.closest ? event.target.closest('[data-tool], #lightBtn, #tempBtn') : null;
        if (!button) return;
        showPath(button.getAttribute('data-tool') || (button.id === 'lightBtn' ? 'light' : 'temp'));
    }, true);

    window.setInterval(refresh, 250);
    refresh();
})();
