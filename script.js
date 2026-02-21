(function () {
    "use strict";

    // --- Bresenham-style even distribution ---
    function bresenhamDistribute(total, groups) {
        var base = Math.floor(total / groups);
        var remainder = total % groups;
        var segments = [];
        var error = 0;
        for (var i = 0; i < groups; i++) {
            error += remainder;
            if (error >= groups) {
                segments.push(base + 1);
                error -= groups;
            } else {
                segments.push(base);
            }
        }
        return segments;
    }

    // --- Core calculation (returns steps array) ---
    function calculate(start, target) {
        if (start === target) {
            return { type: "none" };
        }
        if (target > start) {
            return calcIncrease(start, target);
        }
        return calcDecrease(start, target);
    }

    function calcIncrease(start, target) {
        var inc = target - start;

        if (inc >= start) {
            return calcDenseIncrease(start, target, inc);
        }

        var segments = bresenhamDistribute(start, inc);
        var steps = [];
        for (var i = 0; i < segments.length; i++) {
            steps.push({ text: "Knit " + segments[i] + ", add 1", knit: segments[i], action: 1 });
        }

        var knitSum = segments.reduce(function (a, b) { return a + b; }, 0);
        var verify = verifyIncrease(knitSum, inc, start, target);

        return {
            type: "increase",
            summary: "Increase " + inc + " stitches evenly (" + start + " \u2192 " + target + ")",
            steps: steps,
            verify: verify
        };
    }

    function calcDenseIncrease(start, target, inc) {
        var segments = bresenhamDistribute(inc, start);
        var steps = [];
        for (var i = 0; i < segments.length; i++) {
            steps.push({ text: "Knit 1, add " + segments[i], knit: 1, action: segments[i] });
        }

        var addSum = segments.reduce(function (a, b) { return a + b; }, 0);
        var verify = verifyIncrease(start, addSum, start, target);

        return {
            type: "increase",
            summary: "Increase " + inc + " stitches evenly (" + start + " \u2192 " + target + ") \u2014 dense",
            steps: steps,
            verify: verify
        };
    }

    function verifyIncrease(knitSum, addCount, start, target) {
        var ok = knitSum === start && knitSum + addCount === target;
        return {
            ok: ok,
            text: knitSum + " knit + " + addCount + " added = " + (knitSum + addCount) +
                  (ok ? " \u2705" : " \u274c mismatch")
        };
    }

    function calcDecrease(start, target) {
        var dec = start - target;
        var regularStitches = start - 2 * dec;

        if (regularStitches < 0) {
            return {
                type: "error",
                message: "Cannot decrease from " + start + " to " + target +
                         ": that needs " + dec + " decreases (" + (2 * dec) +
                         " stitches). Max possible: " + Math.floor(start / 2) + "."
            };
        }

        if (regularStitches === 0) {
            var steps = [];
            for (var j = 0; j < dec; j++) {
                steps.push({ text: "K2tog", knit: 0, action: 1 });
            }
            var verify = verifyDecrease(0, dec, start, target);
            return {
                type: "decrease",
                summary: "Decrease " + dec + " stitches (" + start + " \u2192 " + target + ") \u2014 all k2tog",
                steps: steps,
                verify: verify
            };
        }

        var segments = bresenhamDistribute(regularStitches, dec);
        var stepsArr = [];
        for (var i = 0; i < segments.length; i++) {
            stepsArr.push({ text: "Knit " + segments[i] + ", k2tog", knit: segments[i], action: 1 });
        }

        var knitSum = segments.reduce(function (a, b) { return a + b; }, 0);
        var verifyResult = verifyDecrease(knitSum, dec, start, target);

        return {
            type: "decrease",
            summary: "Decrease " + dec + " stitches evenly (" + start + " \u2192 " + target + ")",
            steps: stepsArr,
            verify: verifyResult
        };
    }

    function verifyDecrease(knitSum, decCount, start, target) {
        var consumed = knitSum + 2 * decCount;
        var produced = knitSum + decCount;
        var ok = consumed === start && produced === target;
        return {
            ok: ok,
            text: knitSum + " knit + " + (2 * decCount) + " consumed = " + consumed +
                  ", producing " + produced +
                  (ok ? " \u2705" : " \u274c mismatch")
        };
    }

    // --- Validation ---
    function validate(startStr, targetStr) {
        var start = Number(startStr);
        var target = Number(targetStr);
        if (startStr === "" || targetStr === "") {
            return { ok: false, message: "Please enter both values." };
        }
        if (!Number.isInteger(start) || !Number.isInteger(target)) {
            return { ok: false, message: "Please enter whole numbers only." };
        }
        if (start <= 0 || target <= 0) {
            return { ok: false, message: "Stitch counts must be positive integers." };
        }
        return { ok: true, start: start, target: target };
    }

    // --- DOM refs ---
    var form = document.getElementById("calc-form");
    var resultEl = document.getElementById("result");
    var summaryEl = document.getElementById("result-summary");
    var checklistEl = document.getElementById("result-checklist");
    var progressEl = document.getElementById("result-progress");
    var progressFill = document.getElementById("progress-fill");
    var progressText = document.getElementById("progress-text");
    var verifyEl = document.getElementById("result-verify");
    var errorEl = document.getElementById("error");
    var copyBtn = document.getElementById("copy-btn");
    var resetBtn = document.getElementById("reset-btn");
    var themeToggle = document.getElementById("theme-toggle");

    // Current steps for copy functionality
    var currentSteps = [];

    // --- Checklist rendering ---
    function renderChecklist(steps) {
        currentSteps = steps;
        checklistEl.innerHTML = "";
        for (var i = 0; i < steps.length; i++) {
            var li = document.createElement("li");
            li.className = "check-item";

            var label = document.createElement("label");
            label.className = "check-label";

            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "check-input";
            cb.dataset.index = i;

            var span = document.createElement("span");
            span.className = "check-text";
            span.textContent = steps[i].text;

            var stepNum = document.createElement("span");
            stepNum.className = "check-num";
            stepNum.textContent = (i + 1);

            label.appendChild(cb);
            label.appendChild(stepNum);
            label.appendChild(span);
            li.appendChild(label);
            checklistEl.appendChild(li);
        }
        updateProgress();
    }

    function updateProgress() {
        var boxes = checklistEl.querySelectorAll(".check-input");
        var total = boxes.length;
        if (total === 0) return;

        var checked = 0;
        for (var i = 0; i < boxes.length; i++) {
            if (boxes[i].checked) {
                boxes[i].closest(".check-item").classList.add("done");
                checked++;
            } else {
                boxes[i].closest(".check-item").classList.remove("done");
            }
        }

        var pct = Math.round((checked / total) * 100);
        progressFill.style.width = pct + "%";
        progressText.textContent = checked + " / " + total + " steps";
        progressEl.classList.remove("hidden");

        if (checked === total && total > 0) {
            progressText.textContent = "All done!";
            progressEl.classList.add("complete");
        } else {
            progressEl.classList.remove("complete");
        }
    }

    checklistEl.addEventListener("change", updateProgress);

    // --- Display helpers ---
    function showResult(r) {
        errorEl.classList.add("hidden");
        resultEl.classList.remove("hidden");
        summaryEl.textContent = r.summary;
        renderChecklist(r.steps);
        verifyEl.textContent = r.verify.text;
        verifyEl.className = "result-verify " + (r.verify.ok ? "ok" : "fail");
        copyBtn.classList.remove("hidden");
        resetBtn.classList.remove("hidden");
    }

    function showNone() {
        errorEl.classList.add("hidden");
        resultEl.classList.remove("hidden");
        summaryEl.textContent = "No changes needed";
        checklistEl.innerHTML = '<li class="check-item-info">Current and target stitch counts are equal.</li>';
        verifyEl.textContent = "";
        progressEl.classList.add("hidden");
        copyBtn.classList.add("hidden");
        resetBtn.classList.add("hidden");
        currentSteps = [];
    }

    function showError(msg) {
        resultEl.classList.add("hidden");
        errorEl.classList.remove("hidden");
        errorEl.textContent = msg;
    }

    function hideAll() {
        resultEl.classList.add("hidden");
        errorEl.classList.add("hidden");
    }

    // --- Form submit ---
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        hideAll();

        var startStr = document.getElementById("current-stitches").value.trim();
        var targetStr = document.getElementById("target-stitches").value.trim();
        var v = validate(startStr, targetStr);

        if (!v.ok) { showError(v.message); return; }

        var r = calculate(v.start, v.target);

        if (r.type === "error") { showError(r.message); return; }
        if (r.type === "none") { showNone(); return; }

        showResult(r);
    });

    // --- Copy to clipboard ---
    copyBtn.addEventListener("click", function () {
        var lines = [];
        for (var i = 0; i < currentSteps.length; i++) {
            lines.push((i + 1) + ". " + currentSteps[i].text);
        }
        var text = lines.join("\n");
        navigator.clipboard.writeText(text).then(function () {
            var original = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(function () { copyBtn.textContent = original; }, 1500);
        });
    });

    // --- Reset checkboxes ---
    resetBtn.addEventListener("click", function () {
        var boxes = checklistEl.querySelectorAll(".check-input");
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].checked = false;
        }
        updateProgress();
    });

    // --- Dark mode ---
    function applyTheme(dark) {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
    }

    function getPreferredTheme() {
        try {
            var stored = localStorage.getItem("theme");
            if (stored) return stored === "dark";
        } catch (e) {}
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    applyTheme(getPreferredTheme());

    themeToggle.addEventListener("click", function () {
        var isDark = document.documentElement.getAttribute("data-theme") === "dark";
        applyTheme(!isDark);
    });
})();
