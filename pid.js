const LABEL_COLOR = "rgb(255,255,255)";
const GRID_COLOR = "rgb(128,128,128)";
const EPSILON = 0.000001;
const SCALE_SETTINGS = {
    xAxes: [{
        display: true,
        ticks: {
            maxTicksLimit: 50,
            fontColor: LABEL_COLOR
        },
        gridLines: {
            color: GRID_COLOR
        },
    }],
    yAxes: [{
        type: "linear",
        display: true,
        position: "left",
        gridLines: {
            color: GRID_COLOR
        },
        ticks: {
            fontColor: LABEL_COLOR
        }
    }]
};

var DURATION, FREQUENCY, SAMPLING, MAX_FORCE, mass;

var target, fricK;

var ctxPos, ctxVel, ctxForce, graphPos, graphVel, graphForce;

var simulationFrames, displayFrames;
var dsParticle, dsTarget;

function MotionDataset() {
    this.x = [];
    this.v = [];
    this.a = [];
}

MotionDataset.prototype.push = function(x, v, a) {
    this.x.push(x);
    this.v.push(v);
    this.a.push(a);
};

MotionDataset.prototype.copyFrom = function(other) {
    copyInto(other.x, this.x);
    copyInto(other.v, this.v);
    copyInto(other.a, this.a);
};

MotionDataset.prototype.populate = function(w) {
    this.x = w.slice();
    this.v = w.slice();
    this.a = w.slice();
};

function PID(p, i, d) {
    this.p = p;
    this.i = i;
    this.d = d;

    this.sumError = 0;
    this.lastError = 0;
}

PID.prototype.push = function(error, dt) {
    this.sumError += error * dt;
    var delta = (error - this.lastError) / dt;
    var out = this.p * error + this.i * this.sumError + this.d * delta;
    this.lastError = error;
    return out;
};

function derivative(fun) {
    return function(x) {
        return (fun(x + EPSILON) - fun(x)) / EPSILON;
    };
}

function simulate(args) {
    var pid = new PID(args.pid.p, args.pid.i, args.pid.d);
    const dt = 1 / args.frequency;
    
    const dtarget = derivative(args.target);
    const acctarget = derivative(dtarget);

    var x = 0;
    var v = 0;

    var dsParticle = new MotionDataset();
    var dsTarget = new MotionDataset();

    for (var i = 0; i <= simulationFrames.length; i++) {
        var t = simulationFrames[i];
        const target = args.target(t);
        const deriv = dtarget(t);
        const raw = pid.push(target - x, dt) + args.pid.f * deriv;

        const thrust = Math.min(Math.max(raw, -args.forceLimit), args.forceLimit);  // Constrain the force
        var force;
        if (Math.abs(v) < EPSILON && thrust < args.Fs) {  // Requirement for static friction (not moving and not enough force)
            force = 0;  
        } else {  // Otherwise, use kinetic friction
            var fMag = Math.abs(thrust) - args.Fk(v);
            force = Math.sign(thrust) * fMag;
        }

        const acc = force / args.mass;
        v += force * dt;
        x += v * dt;

        if (i % SAMPLING == 0) {
            dsParticle.push(x, v, acc);
            dsTarget.push(target, deriv, acctarget(t));
        }
    }

    return {
        time: simulationFrames, 
        particle: dsParticle,
        target: dsTarget
    };
}

function copyInto(from, to) {
    for (var i = from.length - 1; i >= 0; i--) {
        to[i] = from[i];
    }
}

function updateGraphOutput() {
    var startTime = new Date().getMilliseconds();
    target = $("#target-function").val();
    fricK = $("#friction-function").val();

    var pid = {
        p: $("#p-slider").val(),
        i: $("#i-slider").val(),
        d: $("#d-slider").val(),
        f: $("#f-slider").val()
    };

    $("#p-value").text(pid.p);
    $("#i-value").text(pid.i);
    $("#d-value").text(pid.d);
    $("#f-value").text(pid.f);

    
    var simulationArgs = {
        pid: pid,
        target: function(t) {
            return eval(target);
        },
        mass: mass,
        duration: DURATION,
        frequency: FREQUENCY,
        forceLimit: MAX_FORCE,
        Fs: parseFloat($("#sim-fs").val()),
        Fk: function(v) { 
            return eval(fricK);
        }
    };

    var output = simulate(simulationArgs);

    dsParticle.copyFrom(output.particle);
    dsTarget.copyFrom(output.target);

    graphPos.update();
    graphVel.update();
    graphForce.update();

    var completedIn = new Date().getMilliseconds() - startTime;
    $("#completed-in").text(completedIn);

}

function initializeCharts() {

    ctxPos = $("#graphPos");
    ctxVel = $("#graphVel");
    ctxForce = $("#graphForce");

    graphPos = new Chart(ctxPos, {
        type: "line",
        cubicInterpolationMode: "monotone",
        options: {
            title: {
                text: "Position over time"
            },
            scales: SCALE_SETTINGS
        }
    });
    
    graphVel = new Chart(ctxVel, {
        type: "line",
        cubicInterpolationMode: "monotone",
        frames: displayFrames,
        options: {
            title: {
                text: "Velocity over time"
            },
            scales: SCALE_SETTINGS
        }
    });

    graphForce = new Chart(ctxForce, {
        type: "line",
        cubicInterpolationMode: "monotone",
        options: {
            title: {
                text: "Acceleration over time"
            },
            scales: SCALE_SETTINGS
        }
    }); 
    
}

function updateSimulationParams() {

    DURATION = parseFloat($("#sim-duration").val());
    FREQUENCY = parseFloat($("#sim-freq").val());
    SAMPLING = parseFloat($("#sim-sample").val());
    MAX_FORCE = parseFloat($("#sim-force-limit").val());
    mass = parseFloat($("#sim-mass").val());

    simulationFrames = _.range(0, DURATION, 1 / FREQUENCY).map(function(t) {
        return Math.round(t * 100) / 100;
    });
    displayFrames = simulationFrames.filter(function(x, i) {
        return i % SAMPLING == 0;
    });

    dsParticle = new MotionDataset();
    dsTarget = new MotionDataset();

    dsParticle.populate(displayFrames);
    dsTarget.populate(displayFrames);

    ctxPos = $("#graphPos");

    graphPos.data = {
        labels: displayFrames,
        datasets: [
            {
                label: "Position",
                //backgroundColor: "rgb(255,0,0)",
                borderColor: "rgb(255,0,0)",
                fill: false,
                data: dsParticle.x,
                pointRadius: 2
            },
            {
                label: "Target",
                //backgroundColor: "rgb(0,0,255)",
                borderColor: "rgb(0,0,255)",
                fill: false,
                data: dsTarget.x,
                pointRadius: 2
            },
        ]
    };
    graphVel.data = {
        labels: displayFrames,
        datasets: [
            {
                label: "Velocity",
                borderColor: "rgb(0,128,0)",
                fill: false,
                data: dsParticle.v,
                pointRadius: 2,
            },
            {
                label: "Target Derivative",
                borderColor: "rgb(0,128,255)",
                fill: false,
                data: dsTarget.v,                 
                pointRadius: 2,
            }
        ]
    };
    graphForce.data = {
        labels: displayFrames,
        datasets: [
            {
                label: "Acceleration",
                borderColor: "rgb(255, 0, 255)",
                fill: false,
                data: dsParticle.a,                 
                pointRadius: 2
            },
            {
                label: "Target Acceleration",
                borderColor: "rgb(255, 255, 0)",
                fill: false,
                data: dsTarget.a,                 
                pointRadius: 2
            }
        ]
    };
    updateGraphOutput();
    
}

$(function() {
    $(".pid-slider").each(function() {
        $(this)[0].oninput = updateGraphOutput;
    });

    $("#target-function").on("keydown", function(e) {
        if (e.keyCode == 13) {
            updateGraphOutput();
        }
    });

    $("#friction-function").on("keydown", function(e) {
        if (e.keyCode == 13) {
            updateGraphOutput();
        }
    });

    // Set chart defaults
    Chart.defaults.global.responsive = true;
    Chart.defaults.global.hoverMode = "index";
    Chart.defaults.global.title.display = true;
    Chart.defaults.global.title.type = "linear";
    Chart.defaults.global.title.fontColor = LABEL_COLOR;
    Chart.defaults.global.legend.labels.fontColor = LABEL_COLOR;
    Chart.defaults.global.animation.duration = 250;

    initializeCharts();
    updateSimulationParams();
});