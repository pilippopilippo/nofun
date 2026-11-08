//
// Settings: the training plan and the zones in watts, from timecrunchy
//

import { xf } from '../functions.js';
import { PLANS, TEXT, NONE, VERSION, selectedPlanId, selectPlan, zoneWatts } from '../timecrunchy.js';

const escape = (text) => String(text).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

class TimecrunchyPlan extends HTMLElement {
    connectedCallback() {
        const current = selectedPlanId();
        const groups = [...new Set(PLANS.map((plan) => plan.group))];
        this.innerHTML = `
            <select class="timecrunchy--select" aria-label="Training plan">
                <option value="${NONE}"${current ? '' : ' selected'}>No plan</option>
                ${groups.map((group) => `
                    <optgroup label="${escape(TEXT.groups[group])}">
                        ${PLANS.filter((plan) => plan.group === group).map((plan) =>
                            `<option value="${plan.id}"${plan.id === current ? ' selected' : ''}>${escape(plan.name)}</option>`).join('')}
                    </optgroup>`).join('')}
            </select>`;
        this.querySelector('select').addEventListener('change', (event) => {
            selectPlan(event.target.value === NONE ? null : event.target.value);
            // the workout list is built when the app starts
            window.location.reload();
        });
    }
}

class TimecrunchyZones extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        this.render(undefined);
        xf.sub('db:ftp', this.render.bind(this), { signal: this.abortController.signal });
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
    render(ftp) {
        const rows = zoneWatts(ftp).map((zone) => `
            <tr>
                <th scope="row"><strong>${zone.id}</strong> ${escape(zone.name)}</th>
                <td>${ftp ? escape(zone.watts) : '–'}</td>
                <td class="timecrunchy--share">${escape(zone.share)}</td>
            </tr>`).join('');
        this.innerHTML = `
            <table class="timecrunchy--zones">
                <caption>${ftp ? `Zones for an FTP of ${escape(ftp)} W` : 'Zones'}</caption>
                <tbody>${rows}</tbody>
            </table>
            <p class="timecrunchy--credit">Plans and zones from <a class="a" href="https://pilippopilippo.github.io/timecrunchy/" target="_blank" rel="noopener">timecrunchy</a> ${VERSION}: <i>The Time-Crunched Cyclist</i> by Chris Carmichael, adapted to a ramp test FTP.</p>`;
    }
}

customElements.define('timecrunchy-plan', TimecrunchyPlan);
customElements.define('timecrunchy-zones', TimecrunchyZones);

export { TimecrunchyPlan, TimecrunchyZones };
