// ==== GLOBAL STATE ====
let spells = [];
let preparedSpells = JSON.parse(localStorage.getItem("preparedSpells") || "[]");
let specialistSpells = JSON.parse(localStorage.getItem("specialistSpells") || "[]");

// how many you can PREPARE per level
const spellSlots =      {0:3, 1:2, 2:1, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
// how many SPECIALIST per level
const specialistSlots = {0:3, 1:3, 2:3, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
// how many CASTS you have per level (for cast page)
const castsPerDay =     {0:3, 1:3, 2:3, 3:2, 4:2, 5:1, 6:1, 7:0, 8:0, 9:0};


// ==== HELPERS ====
function countPreparedByLevel(list) {
  const counts = {};
  list.forEach(name => {
    const spell = spells.find(s => s.name === name);
    const lvl = spell ? spell.level || 0 : 0;
    counts[lvl] = (counts[lvl] || 0) + 1;
  });
  return counts;
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (pageId === 'cast') {
    renderChecked();
  }
}

// ==== LOAD SPELLS ====
async function loadSpells() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Could not load data.json');
    spells = await res.json();
    renderSpells(spells);
  } catch (err) {
    document.getElementById('spells').textContent = err.message;
  }
}


// ==== RENDER SPELLBOOK (main page) ====
function renderSpells(list, filterText = "") {
  const container = document.getElementById('spells');
  container.innerHTML = "";
  const lowerFilter = filterText.toLowerCase();

  const filtered = list.filter(spell => {
    const all = Object.values(spell).join(" ").toLowerCase();
    return all.includes(lowerFilter);
  });

  if (filtered.length === 0) {
    container.textContent = "No spells found.";
    return;
  }

  const grouped = {};
  filtered.forEach(spell => {
    const level = spell.level || "Unknown";
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(spell);
  });

  Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(level => {
      const section = document.createElement('div');
      section.style.width = "100%";

      const title = document.createElement('h2');
      title.textContent = `Level ${level}`;
      const normalCounter = document.createElement('span');
      normalCounter.id = `counter-${level}`;
      normalCounter.className = "counter normal-counter";
      title.appendChild(normalCounter);

      const specialistCounter = document.createElement('span');
      specialistCounter.id = `special-counter-${level}`;
      specialistCounter.className = "counter special-counter";
      title.appendChild(specialistCounter);

      section.appendChild(title);

      const levelContainer = document.createElement('div');
      levelContainer.className = "level-section";
      section.appendChild(levelContainer);

      grouped[level].forEach((spell, index) => {
        const card = document.createElement('div');
        card.className = "spell-card";

        // expand/collapse button
        const button = document.createElement('button');
        button.textContent = spell.name || `Spell ${index + 1}`;
        button.addEventListener('click', () => openSpell(card, levelContainer));
        card.appendChild(button);

        const checks = document.createElement('div');
        checks.className = "checkbox-group";

        // === Prepare checkbox ===
        const prepBox = document.createElement('input');
        prepBox.type = "checkbox";
        prepBox.id = `prep-${level}-${index}`;
        prepBox.value = spell.name;
        prepBox.dataset.spell = spell.name;
        prepBox.dataset.role = "prepare";

        prepBox.checked = preparedSpells.includes(spell.name);
        prepBox.addEventListener('change', () => togglePrepared(spell.name, prepBox.checked));
        checks.appendChild(prepBox);

        const prepLabel = document.createElement('label');
        prepLabel.textContent = "Prepare";
        prepLabel.setAttribute('for', prepBox.id);
        checks.appendChild(prepLabel);

        // === Specialist Slot BUTTON ===
        const school = (spell.school || spell.School || spell.magic_school || "").toString();
        const isConjuration = school.toLowerCase().includes("conjuration");

        if (isConjuration) {
            const specContainer = document.createElement('div');
            specContainer.className = "specialist-container";

            const count = document.createElement('span');
            count.className = "specialist-count";
            count.dataset.spell = spell.name;

            // Initialize count display
            const currentCount = specialistSpells.filter(s => s === spell.name).length;
            count.textContent = `(${currentCount})`;

            const specBtn = document.createElement('button');
            specBtn.textContent = "+";
            specBtn.className = "add-specialist-btn";
            specBtn.title = "Add Specialist Slot";
            specBtn.dataset.spell = spell.name;
            specBtn.dataset.level = level;
            specBtn.addEventListener("click", () => {
                addSpecialistSpell(spell.name, level);
                updateSpecialistCountDisplay(spell.name);
            });

            const specLabel = document.createElement('label');
            specLabel.textContent = "Specialist Slot";
            specLabel.className = "specialist-label";

            specContainer.appendChild(count);
            specContainer.appendChild(specBtn);
            specContainer.appendChild(specLabel);
            checks.appendChild(specContainer);
        }

        card.appendChild(checks);

        const content = document.createElement('div');
        content.className = "spell-content";
        for (const [key, value] of Object.entries(spell)) {
          if (key === "name") continue;
          if (!value || String(value).trim() === "") continue;
          const p = document.createElement('p');
          p.textContent = `${key}: ${value}`;
          content.appendChild(p);
        }

        card.appendChild(content);
        levelContainer.appendChild(card);
      });

      container.appendChild(section);
    });

  updateCounters();
}

// ==== OPEN/CLOSE SPELL ====
function openSpell(card, levelContainer) {
  const content = card.querySelector('.spell-content');
  if (!content) return;
  const isOpen = content.style.display === "block";
  levelContainer.querySelectorAll('.spell-card .spell-content').forEach(c => {
    if (c !== content) c.style.display = "none";
  });
  content.style.display = isOpen ? "none" : "block";
}


// ==== TOGGLE PREPARED ====
function togglePrepared(name, checked) {
  const spell = spells.find(s => s.name === name);
  const level = spell ? spell.level || 0 : 0;
  const currentCounts = countPreparedByLevel(preparedSpells);
  const current = currentCounts[level] || 0;
  const max = spellSlots[level] ?? 0;

  if (checked) {
    if (current >= max) {
      alert(`You can only prepare ${max} spells of level ${level}.`);
      const checkbox = document.querySelector(`input[data-spell="${name}"][data-role="prepare"]`);
      if (checkbox) checkbox.checked = false;
      return;
    }
    preparedSpells.push(name);
  } else {
    preparedSpells = preparedSpells.filter(n => n !== name);
  }
  localStorage.setItem("preparedSpells", JSON.stringify(preparedSpells));
  updateCounters();
}


// ==== TOGGLE SPECIALIST ====
function addSpecialistSpell(name, level) {
  const lvl = Number(level);
  const currentCounts = countPreparedByLevel(specialistSpells);
  const current = currentCounts[lvl] || 0;
  const max = specialistSlots[lvl] ?? 0;

  if (current >= max) {
    alert(`You can only prepare ${max} specialist spells of level ${lvl}.`);
    return;
  }

  specialistSpells.push(name);
  localStorage.setItem("specialistSpells", JSON.stringify(specialistSpells));
  updateCounters();
}

function updateSpecialistCountDisplay(spellName) {
  const countElems = document.querySelectorAll(`.specialist-count[data-spell="${CSS.escape(spellName)}"]`);
  const currentCount = specialistSpells.filter(s => s === spellName).length;
  countElems.forEach(el => (el.textContent = `(${currentCount}x)`));
}

// ==== RENDER CAST PAGE ====
function renderChecked() {
  const list = document.getElementById("checkedList");
  list.innerHTML = "";

  // Load or init remaining casts
  let castsLeftByLevel = JSON.parse(localStorage.getItem("castsLeftByLevel")) || structuredClone(castsPerDay);

  const restBtn = document.getElementById("restButton");
  if (restBtn) {
    restBtn.onclick = () => {
      castsLeftByLevel = structuredClone(castsPerDay);
      localStorage.setItem("castsLeftByLevel", JSON.stringify(castsLeftByLevel));
      renderChecked();
    };
  }

  // === Build combined list with duplicates ===
  const combined = [...preparedSpells, ...specialistSpells];
  if (combined.length === 0) {
    list.innerHTML = "<li>No spells prepared yet.</li>";
    return;
  }

  // Index spell data
  const spellData = {};
  spells.forEach(spell => spellData[spell.name] = spell);

  // Group spells by level and type
  const grouped = {};
  combined.forEach(name => {
    const spell = spellData[name];
    const level = spell ? spell.level || "Unknown" : "Unknown";
    if (!grouped[level]) grouped[level] = { normal: [], specialist: [] };

    if (specialistSpells.includes(name)) grouped[level].specialist.push(name);
    else grouped[level].normal.push(name);
  });

  // === Render each level ===
  Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(level => {
      const lvl = Number(level);
      const castsLeft = castsLeftByLevel[lvl] ?? 0;

      // LEVEL HEADER
      const levelItem = document.createElement("li");
      levelItem.className = "cast-level-title";

      const levelLabel = document.createElement("strong");
      levelLabel.textContent = `Level ${level}`;

      const count = document.createElement("span");
      count.className = "cast-count";
      count.textContent = `${castsLeft} casts left`;
      count.dataset.level = level;

      levelItem.appendChild(levelLabel);
      levelItem.appendChild(count);
      list.appendChild(levelItem);

      // === NORMAL SPELLS ===
      if (grouped[level].normal.length > 0) {
        const sub = document.createElement("p");
        sub.textContent = "Normal Slots:";
        sub.style.color = "#ffcc00";
        sub.style.margin = "0.3rem 0 0.2rem 0.8rem";
        list.appendChild(sub);

        const ul = document.createElement("ul");
        grouped[level].normal.forEach(name => {
          const li = document.createElement("li");
          li.className = "spell-list-item";

          const spellName = document.createElement("span");
          spellName.textContent = name;

          const btn = document.createElement("button");
          btn.textContent = "Cast";
          btn.className = "cast-button";

          btn.addEventListener("click", () => {
            if (castsLeftByLevel[lvl] > 0) {
              castsLeftByLevel[lvl]--;
              localStorage.setItem("castsLeftByLevel", JSON.stringify(castsLeftByLevel));
              const counter = document.querySelector(`.cast-count[data-level="${lvl}"]`);
              if (counter) counter.textContent = `${castsLeftByLevel[lvl]} casts left`;
            } else {
              alert(`No casts left for level ${lvl}!`);
            }
          });

          li.appendChild(spellName);
          li.appendChild(btn);
          ul.appendChild(li);
        });
        list.appendChild(ul);
      }

      // === SPECIALIST SPELLS ===
      if (grouped[level].specialist.length > 0) {
        const sub = document.createElement("p");
        sub.textContent = "Specialist Slots:";
        sub.style.color = "#00bfff";
        sub.style.margin = "0.3rem 0 0.2rem 0.8rem";
        list.appendChild(sub);

        // count duplicates
        const specCounts = {};
        grouped[level].specialist.forEach(name => {
          specCounts[name] = (specCounts[name] || 0) + 1;
        });

        const ul = document.createElement("ul");
        Object.entries(specCounts).forEach(([name, count]) => {
          const li = document.createElement("li");
          li.className = "spell-list-item";

          const spellName = document.createElement("span");
          spellName.textContent = `${name} (${count} remaining)`;
          spellName.style.fontWeight = "bold";

          const btn = document.createElement("button");
          btn.textContent = "Cast";
          btn.className = "cast-button specialist-cast";

          btn.addEventListener("click", () => {
            // Remove only one instance of this spell
            const idx = specialistSpells.indexOf(name);
            if (idx !== -1) specialistSpells.splice(idx, 1);
            localStorage.setItem("specialistSpells", JSON.stringify(specialistSpells));

            updateCounters();
            updateSpecialistCountDisplay(name);
            renderChecked();
          });

          li.appendChild(spellName);
          li.appendChild(btn);
          ul.appendChild(li);
        });
        list.appendChild(ul);
      }
    });
}

// ==== UPDATE COUNTERS IN SPELLBOOK ====
function updateCounters() {
  const normalCounts = countPreparedByLevel(preparedSpells);
  const specialCounts = countPreparedByLevel(specialistSpells);

  for (const level in spellSlots) {
    const used = normalCounts[level] || 0;
    const max = spellSlots[level];
    const el = document.getElementById(`counter-${level}`);
    if (el) el.textContent = ` ( ${used}/${max} normal )`;
  }

  for (const level in specialistSlots) {
    const used = specialCounts[level] || 0;
    const max = specialistSlots[level];
    const el = document.getElementById(`special-counter-${level}`);
    if (el) el.textContent = ` ( ${used}/${max} specialist )`;
  }
}

// ==== EVENTS ====
document.getElementById('search').addEventListener('input', e => renderSpells(spells, e.target.value));
loadSpells();
