/* Classroom experiment controls and gentle background decoration.
 * The switches call BRAIN.setMutedGroups(), which mutes the matching groups
 * in the Web Worker rather than merely hiding them in the interface. */
(function () {
    'use strict';

    var pathways = {
        vision: ['VIS_R1R6', 'VIS_R7R8', 'VIS_ME', 'VIS_LO', 'VIS_LC', 'VIS_LPTC'],
        smell: ['OLF_ORN_FOOD', 'OLF_ORN_DANGER', 'OLF_LN', 'OLF_PN', 'LH_APP', 'LH_AV'],
        taste: ['GUS_GRN_SWEET', 'GUS_GRN_BITTER', 'GUS_GRN_WATER', 'SEZ_FEED', 'SEZ_WATER'],
        touch: ['MECH_BRISTLE', 'MECH_JO', 'MECH_CHORD', 'ANTENNAL_MECH', 'NOCI'],
        movement: ['DN_WALK', 'DN_FLIGHT', 'DN_TURN', 'DN_BACKUP', 'DN_STARTLE', 'VNC_CPG',
            'MN_LEG_L1', 'MN_LEG_R1', 'MN_LEG_L2', 'MN_LEG_R2', 'MN_LEG_L3', 'MN_LEG_R3',
            'MN_WING_L', 'MN_WING_R', 'MN_PROBOSCIS', 'MN_HEAD', 'MN_ABDOMEN']
    };
    var status = document.getElementById('brain-switch-status');

    function updateSwitches() {
        var switchedOff = [];
        var switches = document.querySelectorAll('.brain-switch input');
        for (var i = 0; i < switches.length; i++) {
            var input = switches[i];
            var key = input.getAttribute('data-pathway');
            if (typeof BRAIN !== 'undefined') {
                BRAIN.childPathwayDisabled = BRAIN.childPathwayDisabled || {};
                BRAIN.childPathwayDisabled[key] = input.checked;
            }
            if (typeof BRAIN !== 'undefined' && key === 'movement') {
                /* The visible fly has a hand-authored behaviour layer as well
                 * as motor groups. This flag gates that final body-output
                 * layer, so drives cannot make the fly move around it. */
                BRAIN.childMovementDisabled = input.checked;
            }
            if (typeof BRAIN !== 'undefined' && BRAIN.setMutedGroups) {
                BRAIN.setMutedGroups(pathways[key], input.checked);
            }
            if (input.checked) switchedOff.push(input.parentNode.textContent.replace(/\s+/g, ' ').trim());
        }
        if (!status) return;
        if (typeof BRAIN === 'undefined' || !BRAIN.workerReady) {
            status.textContent = 'Waiting for the brain data to load…';
        } else if (switchedOff.length) {
            status.textContent = 'Switched off: ' + switchedOff.join(', ') + '.';
        } else {
            status.textContent = 'All pathways are on.';
        }
    }

    document.querySelectorAll('.brain-switch input').forEach(function (input) {
        input.addEventListener('change', updateSwitches);
    });
    window.setInterval(updateSwitches, 1000);

    var drawerToggle = document.getElementById('connectome-drawer-toggle');
    if (drawerToggle) {
        drawerToggle.addEventListener('click', function () {
            var panel = document.getElementById('left-panel');
            if (typeof NeuroRenderer !== 'undefined' && NeuroRenderer.isActive()) NeuroRenderer.destroy();
            var nodeHolder = document.getElementById('nodeHolder');
            if (nodeHolder) nodeHolder.classList.remove('hidden');
            var isOpen = panel.classList.toggle('child-connectome-open');
            drawerToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            drawerToggle.textContent = isOpen ? '⌄ Hide brain map' : '🧠 Show brain map';
        });
    }

    function seedFunctionalFlowers() {
        if (typeof food === 'undefined' || food.length) return;
        var count = 2 + Math.floor(Math.random() * 2);
        var positions = [
            [0.16, 0.70], [0.72, 0.72], [0.52, 0.48]
        ];
        for (var i = 0; i < count; i++) {
            var pos = positions[i];
            food.push({
                x: Math.round(window.innerWidth * pos[0]),
                y: Math.round(window.innerHeight * pos[1]),
                radius: 10, feedStart: 0, feedDuration: 0, eaten: 0, kind: 'flower'
            });
        }
    }
    window.setTimeout(seedFunctionalFlowers, 250);

    /* The other flies are visual context only. They do not claim to model
     * social behaviour, which is outside this activity's small model. */
    window.drawChildGarden = function (ctx) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(0, 0, w, h);
        // [[w - 120, h * 0.42], [w * 0.31, h - 150]].forEach(function (pos) {
        //     ctx.fillStyle = 'rgba(69, 63, 43, 0.55)'; ctx.beginPath(); ctx.ellipse(pos[0], pos[1], 12, 6, 0, 0, Math.PI * 2); ctx.fill();
        //     ctx.fillStyle = 'rgba(190, 222, 245, 0.65)'; ctx.beginPath(); ctx.ellipse(pos[0] - 8, pos[1] - 6, 10, 5, -0.45, 0, Math.PI * 2); ctx.fill();
        //     ctx.beginPath(); ctx.ellipse(pos[0] + 8, pos[1] - 6, 10, 5, 0.45, 0, Math.PI * 2); ctx.fill();
        // });
        ctx.restore();
    };
})();
