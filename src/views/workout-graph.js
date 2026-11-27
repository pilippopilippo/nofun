import { xf, exists, existance, equals, clamp, debounce, toFixed, escapeHtml } from '../functions.js';
import { formatTime, translate } from '../utils.js';
import { models } from '../models/models.js';
import { g } from './graph.js';



function powerToHeight(power, powerMax, viewPort) {
    const height = translate(power, 0, powerMax, 0, viewPort.height * 0.90);
    // console.log(`${viewPort.height} -> ${height}`);
    if(height < (viewPort.height * 0.10)) {
        return viewPort.height * 0.14;
    }
    return height;
}

function intervalToWidth(intervalDuration, totalDuration, totalWidth) {
    return clamp(1,
                 totalDuration,
                 translate(intervalDuration, 0, totalDuration, 0, totalWidth)
                );
}

function intervalsToMaxPower(intervals, ftp) {
    return intervals.reduce((highest, interval) => {
        interval.steps.forEach((step) => {
            const power = models.ftp.toAbsolute(step.power, ftp);
            if(power > highest) highest = power;
        });
        return highest;
    }, ftp * 1.6);
}

function Interval(acc, interval, width, ftp, powerMax, viewPort) {
    const stepsLength = interval.steps.length;

    return acc + interval.steps.reduce((a, step) => {
        const power    = models.ftp.toAbsolute(step.power, ftp) ?? 0;
        const cadence  = step.cadence;
        const slope    = step.slope;
        const duration = step.duration;
        const width    = 100 / stepsLength;
        const height   = powerToHeight(power, powerMax, viewPort);
        const zone     = (models.ftp.powerToZone(power, ftp)).name;
        const infoTime = formatTime({value: duration, format: 'mm:ss'});

        const powerAttr    = exists(power)    ? `power="${escapeHtml(power)}"` : '';
        const cadenceAttr  = exists(cadence)  ? `cadence="${escapeHtml(cadence)}"` : '';
        const slopeAttr    = exists(slope)    ? `slope="${escapeHtml(slope)}"` : '';
        const durationAttr = exists(duration) ? `duration="${escapeHtml(infoTime)}"` : '';

        return a +
            `<div class="graph--bar zone-${zone}" style="height: ${height}px; width: ${width}%" ${powerAttr} ${cadenceAttr} ${slopeAttr} ${durationAttr}></div>`;
    }, `<div class="graph--bar-group" style="width: ${width}px;">`) + `</div>`;
}

function intervalsToGraph(workout, ftp, viewPort) {
    const totalWidth    = viewPort.width;
    const intervals     = workout.intervals;
    const totalDuration = workout.meta.duration;
    const maxPower      = intervalsToMaxPower(intervals, ftp);

    return intervals.reduce((acc, interval) => {
        let width = 1;

        if(exists(interval.duration)) {
            width = intervalToWidth(interval.duration, totalDuration, totalWidth);
            return Interval(acc, interval, width, ftp, maxPower, viewPort);
        }

        return '';
    }, '<div class="graph--info--cont"></div>');
}

function renderInfo(args = {}) {
    const power    = exists(args.power)    ? `${args.power}W `: '';
    const cadence  = exists(args.cadence)  ? `${args.cadence}rpm `: '';
    const slope    = exists(args.slope)    ? `${toFixed(args.slope, 2)}%` : '';
    const duration = exists(args.duration) ? `${args.duration}min `: '';
    const distance = exists(args.distance) ? `${args.distance}m `: '';
    const dom      = args.dom;

    const intervalLeft = args.intervalRect.left;
    const contLeft     = args.contRect.left;
    const contWidth    = args.contRect.width;
    const left         = intervalLeft - contLeft;
    const bottom       = args.intervalRect.height;

    dom.info.style.display = 'block';
    dom.info.innerHTML = `<div>${escapeHtml(power)}</div><div>${escapeHtml(cadence)}</div><div>${escapeHtml(slope)}</div><div class="graph--info--time">${escapeHtml(duration)}</div>`;

    const width  = dom.info.getBoundingClientRect().width;
    const height = dom.info.getBoundingClientRect().height;
    const minHeight = (bottom + height + (40)); // fix 40
    dom.info.style.left = `min(${contWidth}px - ${width}px, ${left}px)`;

    if(window.innerHeight > minHeight) {
        dom.info.style.bottom = bottom;
    } else {
        dom.info.style.bottom = bottom - (minHeight - window.innerHeight);
    }
}

// nofun: what the rider does, drawn over the workout as it goes: power (3 s) and cadence,
// one point a second at its place in the workout (Skip leaves a gap, Previous draws again
// from there). Power uses the scale of the bars, so the line sits on the target; cadence its
// own scale, 0 to CADENCE_MAX rpm.
const CADENCE_MAX = 150;

// the second of the workout each interval starts at
function intervalStarts(intervals = []) {
    const starts = [];
    let t = 0;
    for(const interval of intervals) {
        starts.push(t);
        t += interval?.duration ?? 0;
    }
    return starts;
}

// the second of the workout the rider is at: from the interval and the time left in it
function workoutPosition(intervals, starts, index, lapTime) {
    const duration = intervals?.[index]?.duration;
    if(!exists(duration) || !Number.isFinite(lapTime)) return -1;
    return Math.round(starts[index] + Math.min(duration, Math.max(0, duration - lapTime)));
}

// an SVG path through the values (one a second, x = the second): a gap where there are none.
// With step > 1 each point is the average of step seconds (about one point a pixel: a long
// workout on a narrow screen stays a line, not a band).
function tracePath(values, y, step = 1) {
    let d = '';
    let pen = false;
    for(let start = 0; start < values.length; start += step) {
        let sum = 0;
        let xs = 0;
        let n = 0;
        for(let x = start; x < Math.min(start + step, values.length); x++) {
            if(!Number.isFinite(values[x])) continue;
            sum += values[x];
            xs += x;
            n += 1;
        }
        if(n === 0) { pen = false; continue; }
        const x = xs / n;
        d += `${pen ? 'L' : 'M'}${Number.isInteger(x) ? x : x.toFixed(1)} ${y(sum / n).toFixed(1)}`;
        pen = true;
    }
    return d;
}

const TRACE = `<svg class="nf-trace" aria-hidden="true" preserveAspectRatio="none">` +
      `<path class="nf-trace-cadence" d=""/><path class="nf-trace-power-halo" d=""/><path class="nf-trace-power" d=""/></svg>` +
      `<p class="nf-trace-legend" hidden><span class="nf-trace-key nf-trace-key-power">Power</span><span class="nf-trace-key nf-trace-key-cadence">Cadence</span></p>`;

class WorkoutGraph extends HTMLElement {
    constructor() {
        super();
        this.workout = {};
        this.workoutStatus = "stopped";
        this.metricValue = 0;
        this.index = 0;
        this.minHeight = 30;
        this.type = 'workout';
        this.watchStatus = 'stopped';
        this.live = { power: 0, cadence: 0 };
        this.trace = { power: [], cadence: [], last: -1, starts: [] };
    }
    connectedCallback() {
        const self = this;
        this.dom = {};
        this.$graphCont = document.querySelector('#graph-workout') ?? this;
        this.viewPort = this.getViewPort();
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.debounced = {
            onWindowResize: debounce(
                self.onWindowResize.bind(this), 300, {trailing: true, leading: false},
            ),
        };


        xf.sub(`db:workout`, this.onWorkout.bind(this), this.signal);
        xf.sub(`db:ftp`, this.onFTP.bind(this), this.signal);

        xf.sub('db:intervalIndex', this.onIntervalIndex.bind(this), this.signal);
        xf.sub('db:distance', this.onDistance.bind(this), this.signal);
        xf.sub('db:page', this.onPage.bind(this), this.signal);
        xf.sub('db:lapTime', this.onLapTime.bind(this), this.signal);
        xf.sub('db:workoutStatus', this.onWorkoutStatus.bind(this), this.signal);
        xf.sub('db:power3s', (power) => { this.live.power = power; }, this.signal);
        xf.sub('db:cadence', (cadence) => { this.live.cadence = cadence; }, this.signal);
        xf.sub('db:watchStatus', this.onWatchStatus.bind(this), this.signal);
        xf.sub('db:elapsed', this.onElapsed.bind(this), this.signal);

        this.addEventListener('mouseover', this.onHover.bind(this), this.signal);
        this.addEventListener('mouseout', this.onMouseOut.bind(this), this.signal);
        // window.addEventListener('resize', this.debounced.onWindowResize.bind(this), this.signal);
        window.addEventListener('resize', this.onWindowResize.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    getViewPort() {
        // const rect = this.getBoundingClientRect();
        const rect = this.$graphCont.getBoundingClientRect();

        return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            aspectRatio: rect.width / rect.height,
        };
    }
    onFTP(value) {
        this.ftp = value;
        if(exists(this.workout.intervals)) this.render();
    }
    onPage(page) {
        if(equals(page, 'home')) {
            const viewPort = this.getViewPort();
            this.viewPort = viewPort;
            this.render();
        }
    }
    onWindowResize(e) {
        const viewPort = this.getViewPort();
        if(equals(viewPort.width, 0)) return;
        this.viewPort = viewPort;
        this.render();
    }
    onHover(e) {
        const self = this;
        const target = this.querySelector('.graph--bar:hover');
        if(exists(target)) {
            const power        = target.getAttribute('power');
            const cadence      = target.getAttribute('cadence');
            const slope        = target.getAttribute('slope');
            const duration     = target.getAttribute('duration');
            const distance     = target.getAttribute('distance');
            const intervalRect = target.getBoundingClientRect();

            this.renderInfo({
                power,
                cadence,
                slope,
                duration,
                distance,
                intervalRect,
                contRect: self.viewPort,
                dom: self.dom,
            });
        }
    }
    onMouseOut(e) {
        this.dom.info.style.display = 'none';
    }
    onWorkout(value) {
        if(value !== this.workout) this.clearTrace(value);
        this.workout = value; // this.workout = Object.assign({}, value);

        if(exists(value.intervals)) {
            this.type = 'workout';
        }
        if(exists(value.points)) {
            this.type = 'course';
        }

        if(!equals(this.viewPort.width, 0)) {
            this.render();
        }
    }
    onWorkoutStatus(value) {
        this.workoutStatus = value;
    }
    onWatchStatus(status) {
        // a new ride starts with a clean graph; the last one stays until then
        if(status === 'started' && this.watchStatus === 'stopped') {
            this.clearTrace(this.workout);
            this.drawTrace();
        }
        this.watchStatus = status;
    }
    clearTrace(workout) {
        this.trace = { power: [], cadence: [], last: -1, starts: intervalStarts(workout?.intervals) };
    }
    // one point a second while the workout runs. The timer writes the elapsed time before the
    // time left in the interval, so this is the second that has just gone by.
    onElapsed() {
        if(this.watchStatus !== 'started' || this.workoutStatus !== 'started') return;
        if(!equals(this.type, 'workout') || !exists(this.workout?.intervals)) return;
        const t = this.trace;
        const at = workoutPosition(this.workout.intervals, t.starts, this.index, this.lapTime);
        if(at < 0) return;
        // Previous: what was drawn from here on is drawn again
        if(at < t.last) {
            t.power.length = at;
            t.cadence.length = at;
        }
        t.power[at] = Math.max(0, this.live.power || 0);
        t.cadence[at] = Math.max(0, this.live.cadence || 0);
        const next = at === t.last + 1;
        t.last = at;
        if(next && this.dom.traceStep === 1 && this.dom.tracePower?.getAttribute('d')) {
            this.appendTrace(at);
        } else {
            this.drawTrace();
        }
    }
    // the scales, from the size of the graph and of the bars (render)
    traceScales() {
        const height = this.getBoundingClientRect().height;
        const barsHeight = this.viewPort.height * 0.90;
        const maxPower = this.maxPower || 1;
        const y = (share) => Math.min(height - 1, Math.max(1, height - share));
        return {
            power: (power) => y((power / maxPower) * barsHeight),
            cadence: (cadence) => y((cadence / CADENCE_MAX) * height * 0.90),
        };
    }
    appendTrace(at) {
        const scale = this.dom.traceScale;
        if(!scale) return;
        const p = `L${at} ${scale.power(this.trace.power[at]).toFixed(1)}`;
        const c = `L${at} ${scale.cadence(this.trace.cadence[at]).toFixed(1)}`;
        this.dom.tracePower.setAttribute('d', this.dom.tracePower.getAttribute('d') + p);
        this.dom.traceHalo.setAttribute('d', this.dom.traceHalo.getAttribute('d') + p);
        this.dom.traceCadence.setAttribute('d', this.dom.traceCadence.getAttribute('d') + c);
    }
    drawTrace() {
        if(!this.dom.trace) return;
        const scale = this.dom.traceScale;
        const has = this.trace.last >= 0 && exists(scale);
        const step = this.dom.traceStep ?? 1;
        const power = has ? tracePath(this.trace.power, scale.power, step) : '';
        this.dom.tracePower.setAttribute('d', power);
        this.dom.traceHalo.setAttribute('d', power);
        this.dom.traceCadence.setAttribute('d', has ? tracePath(this.trace.cadence, scale.cadence, step) : '');
        this.dom.traceLegend.hidden = !has;
    }
    // the trace spans the bars exactly: x in seconds of the workout, y in pixels
    layoutTrace() {
        const svg = this.dom.trace;
        const groups = this.dom.intervals;
        if(!svg || !groups?.length) return;
        const parent = this.getBoundingClientRect();
        const first = groups[0].getBoundingClientRect();
        const last = groups[groups.length - 1].getBoundingClientRect();
        const total = (this.workout.intervals ?? []).reduce((sum, i) => sum + (i?.duration ?? 0), 0);
        if(!(parent.height > 0) || !(total > 0)) {
            this.dom.traceScale = undefined;
            return;
        }
        const width = Math.max(1, last.right - first.left);
        svg.style.left = `${first.left - parent.left}px`;
        svg.style.width = `${width}px`;
        svg.setAttribute('viewBox', `0 0 ${total} ${parent.height}`);
        this.dom.traceScale = this.traceScales();
        this.dom.traceStep = Math.max(1, Math.floor(total / width));
    }
    onIntervalIndex(index) {
        const self = this;
        this.index = index;
        this.progress({index: self.index, dom: self.dom, parent: self, lapTime: self.lapTime});
    }
    onDistance(distance) {
        const self = this;
        if(exists(this.workout?.points)) {
            const totalDistance = this.workout.meta.distance;
            const $dom = self.dom;
            const $parent = self;
            const height = $parent.getBoundingClientRect().height;
            const width = $parent.getBoundingClientRect().width;
            const left = translate(distance, 0, totalDistance, 0, width);
            $dom.active.style.left   = `${left % width}px`;
            $dom.active.style.width  = `2px`;
            $dom.active.style.height = `${height}px`;

            if(equals(this.type, 'course')) {
                $dom.progress.style.left   = `${left % width}px`;
            }
        }
        return;
    }
    onLapTime(lapTime) {
        const self = this;
        this.lapTime = lapTime;
        if(equals(this.type, 'workout')) {
            this.progress({index: self.index, dom: self.dom, parent: self, lapTime: self.lapTime});
        }
    }
    progress(args = {}) {
        if(this.workoutStatus === "done") {
            return;
        }

        const index                 = args.index ?? 0;
        const lapTime               = args.lapTime ?? this.workout.intervals[index].duration;
        const $dom                  = args.dom;
        const $parent               = args.parent;
        const rect                  = $dom.intervals[index].getBoundingClientRect();
        const left                  = rect.left - $parent.getBoundingClientRect().left;
        const lapPercentageComplete = 1 - (lapTime / this.workout.intervals[index].duration);

        $dom.active.style.left   = `${left}px`;
        $dom.active.style.width  = `${rect.width}px`;
        $dom.active.style.height = `${$parent.getBoundingClientRect().height}px`;

        $dom.progress.style.width = `${left + (rect.width * lapPercentageComplete)}px`;
    }
    render() {
        const self = this;
        const progress = `<div id="progress" class="progress"></div><div id="progress-active"></div>`;

        if(equals(this.type, 'workout')) {
            this.innerHTML = progress +
                intervalsToGraph(this.workout, this.ftp, this.viewPort);

            this.dom.info      = this.querySelector('.graph--info--cont');
            this.dom.progress  = this.querySelector('#progress');
            this.dom.active    = this.querySelector('#progress-active');
            this.dom.intervals = this.querySelectorAll('.graph--bar-group');
            this.dom.steps     = this.querySelectorAll('.graph--bar');

            this.progress({index: self.index, dom: self.dom, parent: self, lapTime: self.lapTime});

            this.maxPower = intervalsToMaxPower(this.workout.intervals, this.ftp);
            if(!this.trace.starts.length) this.clearTrace(this.workout);
            this.insertAdjacentHTML('beforeend', TRACE);
            this.dom.trace        = this.querySelector('.nf-trace');
            this.dom.tracePower   = this.querySelector('.nf-trace-power');
            this.dom.traceHalo    = this.querySelector('.nf-trace-power-halo');
            this.dom.traceCadence = this.querySelector('.nf-trace-cadence');
            this.dom.traceLegend  = this.querySelector('.nf-trace-legend');
            this.layoutTrace();
            this.drawTrace();
        }

        if(equals(this.type, 'course')) {
            this.innerHTML = progress +
                courseToGraph(this.workout, this.viewPort);

            this.dom.info     = this.querySelector('.graph--info--cont');
            this.dom.progress = this.querySelector('#progress');
            this.dom.active   = this.querySelector('#progress-active');
            this.dom.trace    = undefined;
        }
    }
    renderInfo(args = {}) {
        renderInfo(args);
    }
}

customElements.define('workout-graph', WorkoutGraph);



function Segment(points, prop) {
    return points.reduce((acc, point, i) => {
        const value = point[prop];
        if(value > acc.max) acc.max = value;
        if(value < acc.min) acc.min = value;
        if(equals(i, 0)) { acc.min = value; acc.start = value; };
        if(equals(i, points.length-1)) acc.end = value;
        return acc;
    }, {min: 0, max: 0, start: 0, end: 0,});
}

function scale(value, max = 100) {
    return 100 * (value/max);
}

function courseToGraph(course, viewPort) {
    const altitudeSpec  = Segment(course.points, 'y');

    const distanceTotal = course.meta.distance;
    const aspectRatio   = viewPort.aspectRatio;
    const yOffset       = Math.min(altitudeSpec.min, altitudeSpec.start, altitudeSpec.end);
    const yMax          = (altitudeSpec.max - altitudeSpec.min);
    const yScale        = (1 / ((aspectRatio * yMax) / distanceTotal));
    const flatness      = ((altitudeSpec.max - altitudeSpec.min));
    const altitudeScale = yScale * ((flatness < 100) ? 0.2 : 0.7);

    const viewBox = { width: distanceTotal, height: yMax, };

    // console.table({distanceTotal, yMax, aspectRatio, yScale, flatness, altitudeScale, altitudeSpec});

    const track = course.pointsSimplified.reduce((acc, p, i, xs) => {
        const color = g.slopeToColor(p.slope);

        const px1 = p.x;
        const px2 = xs[i+1]?.x ?? px1;
        const py1 = p.y;
        const py2 = xs[i+1]?.y ?? py1;

        const x1 = px1;
        const y1 = yMax;
        const x2 = px1;
        const y2 = yMax - ((py1-yOffset) * altitudeScale);
        const x3 = px2;
        const y3 = yMax - ((py2-yOffset) * altitudeScale);
        const x4 = px2;
        const y4 = yMax;

        const slopeAttr = exists(p.slope) ? `slope="${escapeHtml(p.slope)}"` : '';
        return acc + `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}" stroke="none" fill="${color}" class="graph--bar" index="${i}" ${slopeAttr} />`;

    }, ``);

    const display =
          `<altitude-value class="elevation--value altitude--value">${altitudeSpec.start ?? '--'}</altitude-value>
        <ascent-value class="elevation--value ascent--value">0.0</ascent-value>`;

    return `${display}<div class="graph--info--cont"></div><svg class="graph--bar-group" width="100%" height="100%" viewBox="0 0 ${viewBox.width} ${viewBox.height}" preserveAspectRatio="xMinYMax meet">${track}</svg>`;
}

export {
    WorkoutGraph,
    intervalStarts,
    workoutPosition,
    tracePath,
    intervalsToGraph,
    courseToGraph,
    renderInfo,
};

