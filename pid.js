const DURATION = 20;
const FREQUENCY = 10;
const LABEL_COLOR = "rgb(255,255,255)";
const GRID_COLOR = "rgb(128,128,128)";

var target = "1";

var ctxPos, ctxVel, ctxForce, graphPos, graphVel, graphForce;

var dsPos, dsTarget, dsDTarget, dsVel, dsForce, dsOutput;

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
    var h = 0.00000001;
    return function(x) {
        return (fun(x + h) - fun(x)) / h;
    };
}

function simulate(args) {
    var pid = new PID(args.pid.p, args.pid.i, args.pid.d);
    const dt = 1 / args.frequency;
    const frames = _.range(0, args.duration, dt).map(function(t) {
        return Math.round(t * 100) / 100;
    });
    const dtarget = derivative(args.target);

    var x = 0;
    var v = 0;

    var x_ = [];
    var v_ = [];
    var d_ = [];
    var f_ = [];
    var p_ = [];
    var t_ = [];

    for (var i = 0; i <= frames.length; i++) {
        var t = frames[i];
        const target = args.target(t);
        const deriv = dtarget(t);
        const raw = pid.push(target - x, dt) + args.pid.f * deriv;

        const force = Math.min(Math.max(raw, -args.forceLimit), args.forceLimit);  // Constrain the force
        v += force * dt;
        x += v * dt;

        x_.push(x);
        v_.push(v);
        d_.push(deriv);
        f_.push(force);
        p_.push(raw);
        t_.push(target);
    }

    return {
        time: frames, 
        pos: x_, 
        vel: v_, 
        force: f_, 
        pid: p_, 
        target: t_,
        deriv: d_
    };
}

function onSliderChange() {
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

    updateChart(pid);
}

function copyInto(from, to) {
    for (var i = from.length - 1; i >= 0; i--) {
        to[i] = from[i];
    }
}

function updateChart(pidArgs) {
    var simulationArgs = {
        pid: pidArgs,
        target: function(t) {
            return eval(target);
        },
        duration: 20,
        frequency: 10,
        forceLimit: 10
    };

    var startTime = new Date().getMilliseconds();
    var output = simulate(simulationArgs);
    var completedIn = new Date().getMilliseconds() - startTime;

    copyInto(output.pos, dsPos);
    copyInto(output.vel, dsVel);
    copyInto(output.deriv, dsDTarget);
    copyInto(output.target, dsTarget);
    copyInto(output.force, dsForce);
    copyInto(output.pid, dsOutput);

    graphPos.update();
    graphVel.update();
    graphForce.update();
}

function updateTargetFunction() {
    target = $("#target-function").val();
    onSliderChange();
}

$(function() {
    $(".pid-slider").each(function() {
        $(this)[0].oninput = onSliderChange;
    });

    $("#target-function").on("keydown", function(e) {
        if (e.keyCode == 13) {
            updateTargetFunction();
        }
    });

    var frames = _.range(0, DURATION, 1 / FREQUENCY).map(function(t) {
        return Math.round(t * 100) / 100;
    });
    dsPos = frames.slice();
    dsTarget = frames.slice();
    dsVel = frames.slice();
    dsDTarget = frames.slice();
    dsForce = frames.slice();
    dsOutput = frames.slice();

    ctxPos = $("#graphPos");
    graphPos = new Chart(ctxPos, {
        type: "line",
        cubicInterpolationMode: "monotone",
        data: {
            labels: frames,
            datasets: [
                {
                    label: "Position",
                    //backgroundColor: "rgb(255,0,0)",
                    borderColor: "rgb(255,0,0)",
                    fill: false,
                    data: dsPos,
                    pointRadius: 2
                },
                {
                    label: "Target",
                    //backgroundColor: "rgb(0,0,255)",
                    borderColor: "rgb(0,0,255)",
                    fill: false,
                    data: dsTarget,
                    pointRadius: 2
                },
            ]
        },
        options: {
            responsive: true,
            hoverMode: "index",
            stacked: false,
            title: {
                display: true,
                type: "linear",
                text: "Position over time",
                fontColor: LABEL_COLOR
            },
            legend: {
                labels: {
                    fontColor: LABEL_COLOR
                }
            },
            scales: {
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
            }
        }
    });
    
    ctxVel = $("#graphVel");
    graphVel = new Chart(ctxVel, {
        type: "line",
        cubicInterpolationMode: "monotone",
        frames: frames,
        data: {
            labels: frames,
            datasets: [
                {
                    label: "Velocity",
                    borderColor: "rgb(0,128,0)",
                    fill: false,
                    data: dsVel,
                    pointRadius: 2,
                },
                {
                    label: "Target Derivative",
                    borderColor: "rgb(0,128,255)",
                    fill: false,
                    data: dsDTarget,                 
                    pointRadius: 2,
                }
            ]
        },
        options: {
            responsive: true,
            hoverMode: "index",
            stacked: false,
            title: {
                display: true,
                type: "linear",
                text: "Velocity over time",
                fontColor: LABEL_COLOR
            },
            legend: {
                labels: {
                    fontColor: LABEL_COLOR
                }
            },
            scales: {
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
            }
        }
    });

    ctxForce = $("#graphForce");
    graphForce = new Chart(ctxForce, {
        type: "line",
        cubicInterpolationMode: "monotone",
        data: {
            labels: frames,
            datasets: [
                {
                    label: "Raw PID Output",
                    fill: false,
                    borderColor: "rgb(255, 255, 0)",
                    data: dsOutput,                 
                    pointRadius: 2
                },
                {
                    label: "Constrained Force",
                    borderColor: "rgb(255, 0, 255)",
                    fill: false,
                    data: dsForce,                 
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            hoverMode: "index",
            stacked: false,
            title: {
                display: true,
                type: "linear",
                text: "Force over time",
                fontColor: LABEL_COLOR
            },
            legend: {
                labels: {
                    fontColor: LABEL_COLOR
                }
            },
            scales: {
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
            }
        }
    }); 
    onSliderChange();
});