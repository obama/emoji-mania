document.body.onload = function () {
  var inputs = document.querySelectorAll('textarea, input[type=text], input:not([type]), input[type=search]');
  /*if (inputs.length == 0) {
    setTimeout(() => { document.body.onload() }, 1000);
    return;
  }*/
  emojiHistory = []
  emojiPanelOpen = false;
  emojiSearch = '';

  chrome.storage.local.get('history', (items) => {
    if (items.history != null && items.history.length > 0)
      emojiHistory = items.history;
  });

  // inject emoji panel only if there actually are inputs or textareas in the page
  if (inputs.length > 0) {
    var smolBtn = document.createElement('button'); // the smol circle button that open the panel
    smolBtn.setAttribute('class', 'btn-floating blue');
    smolBtn.id = 'emojiSelectorSmallButton';

    var el = document.createElement('div'); // the select panel
    el.id  = "emojiSelector";
    el.href = "#!";
    s = '<div class="categoryPicker"></div>'
      + '<div class="emojiSelectorSearch">'
	    + '  <div class="searchIcon">🔎</div>'
      + '  <input type="search" id="emojiSelectorSearch" placeholder="search for emoji">'
      + '  <button id="emojiSelectorClose" title="close" class="btn-flat red darken-2">X</button>'
	    + '</div>'
      + '<div id="emojiSelectorEmojiList">'
      + '  <div id="emojiSelectorHistory" class="hide"></div>'
      + '  <div id="emojiSelectorActualEmojiList"></div>'
      + '</div>';

    // create category buttons
    var catString = '<button id="emojiSelectorCatButton-0" title="Recently used emojis">🕒</button>';
    Object.entries(emojiSelectorEmojiData.groups).forEach(([index, group]) => {
	    let i = parseInt(index) + 1;
      catString += '<button id="emojiSelectorCatButton-' + i + '" title="' + group + '">' + emojiSelectorEmojiData.groupIcons[index] + '</button>';
    });

    el.innerHTML = s;
    smolBtn.innerHTML = '<i>😁</i>';
    document.body.appendChild(el);
    document.body.appendChild(smolBtn);
    document.querySelector('#emojiSelector .categoryPicker').innerHTML = catString;
    addClass(el, 'hide');
    addClass(smolBtn, 'hide');
    //addClass(smolBtn, 'hide');

  	// make category buttons clickable
  	for (let e of document.querySelectorAll("#emojiSelector .categoryPicker button")) {
  		e.onclick = (e) => {
  			let id = e.target.id.split("-")[1];
        let catEl = document.querySelector("[id=emojiSelectorCatAnchor-"+id+"]");
        if (catEl != undefined)
  			   document.querySelector("#emojiSelectorEmojiList").scrollTop += getOffset(catEl, document.querySelector("#emojiSelectorEmojiList")).top + 1;
  		}
  	}

    createEmojiList();
	  // on scroll change the highlighted category
	  makeCategoryButtonsWork();
	  // onlick actions for emojis
    makeButtonsClickable();

	// make the search work
	document.querySelector("#emojiSelectorSearch").oninput = (e) => {
		emojiSearch = e.target.value;
    createEmojiList(emojiSearch);
    createRecentUsedList(emojiHistory, emojiSearch);
    makeButtonsClickable();
    makeCategoryButtonsWork();
	};

	// make closebutton work
    var closeButton = document.querySelector('#emojiSelectorClose');
    if (closeButton != null) {
      closeButton.onclick = () => { hideEmojiPanel(); };
    }

  }
  else return;//alert('no inputs'); // exit

  // add onlick events to all textual input fields
  for (let input of inputs) {
    input.onclick = () => showEmojiButton(input);
  }
  //else alert('no inputs')

  // when clicking somewhere else hide the panel
  el.onmousedown = (e) => e.stopPropagation();
  smolBtn.onmousedown = (e) => e.stopPropagation();
  window.addEventListener('mousedown', (e) => { hideEmojiPanel(); hideEmojiButton(); });


};

/* ----------------------------------------------------------------------------
 *
 * --------------------------------------------------------------------------*/

function createEmojiList(search) {
  //alert(Object.entries(emojiSelectorEmojiData.emojis))
  let s = '', emojilist = [], emojisInGroup = [];
  // reserve space for groups and subgroups
  emojilist.length = emojiSelectorEmojiData.groups.length;
  emojisInGroup.length = emojilist.length;
  for (let i = 0; i < emojilist.length; i++) {
    emojilist[i] = [];
    emojisInGroup[i] = 0;
    emojilist[i].length = emojiSelectorEmojiData.subgroups[i].length;
    for (let j = 0; j < emojilist[i].length; j++)
      emojilist[i][j] = [];
  }

  // collect all emojis that meat search term
  Object.entries(emojiSelectorEmojiData.emojis).forEach(e => {
      if (search == undefined || search == '' || e[1].name.join('').indexOf(search) >= 0) {
        emojilist[e[1].group[0]][e[1].group[1]].push(e[0]);
        emojisInGroup[e[1].group[0]]++; // count emojis in group so we know if there are any in this group later when displaying the list. else for each group wed have to check if subgroups are filled at all to decide if we print the groups header
      }
  });
  //alert(JSON.stringify(emojilist))

  // dispplay emojins
  for (let i = 0; i < emojilist.length; i++) {
    if (emojisInGroup[i] > 0) {
      s += '<h1 id="emojiSelectorCatAnchor-' + (i+1) + '">' + emojiSelectorEmojiData.groups[i] + '</h1>';
      for (let j = 0; j < emojilist[i].length; j++) {
        if (emojilist[i][j].length == 0)
          continue;
        s += '<h2>' + emojiSelectorEmojiData.subgroups[i][j] + '</h2>'
          +  '<div class="emojiGrid">';
        for (let k = 0; k < emojilist[i][j].length; k++) {
          s += '<button class="pick" title="' + emojiSelectorEmojiData.emojis[emojilist[i][j][k]].name[0] + '">' + emojilist[i][j][k] + '</button>';
        }
        s += '</div>';
      }
    }
  }
  document.querySelector('#emojiSelectorActualEmojiList').innerHTML = s;
}

function makeCategoryButtonsWork() {
  document.querySelector('#emojiSelectorEmojiList').onscroll = (e) => {
		var el = document.querySelector('#emojiSelectorEmojiList');
		var ol = document.querySelectorAll('[id^="emojiSelectorCatAnchor-"');
		let maxNegTop = { el: null, y: -9999};
		for (let o of ol) {
			let x = o.getBoundingClientRect().top - el.getBoundingClientRect().top;
			if (x < 0 && x > maxNegTop.y) {
				maxNegTop = { el: o, y: x};
			}
		}
		if (maxNegTop.el == null) return;
		let activeCatId = maxNegTop.el.id.split("-")[1];
		let catEls = document.querySelectorAll("#emojiSelector .categoryPicker button");
		if (catEls !== undefined) {
			for (let e of catEls) {
				removeClass(e, "activeCategory");
			}
			addClass(catEls[activeCatId], "activeCategory");
		}
	};
}

function showEmojiButton(input) {
  var el = document.querySelector('#emojiSelectorSmallButton');
  var pos = getOffset(input);

  if (getFixedParent(input) != null)
    el.style.position = 'fixed';
  else
    el.style.position = 'absolute';
  if (pos.left + el.clientWidth > document.documentElement.clientWidth)
    pos.left = document.documentElement.clientWidth - el.clientWidth;
  //var newY = pos.top - el.clientHeight;
  var newY = pos.top + input.clientHeight;
  if (newY < 0)
    newY = pos.top + input.clientHeight;
  //if (newY > document.documentElement.clientHeight)
  //  newY = document.documentElement.clientHeight - el.clientHeight;
  el.style.top  = newY + 'px';
  el.style.left = pos.left + 'px';
  removeClass(el, 'hide');
  el.onclick = (e) => {
    showEmojiPanel(input);
    hideEmojiButton();
  }
}

function hideEmojiButton() {
  var el = document.querySelector('#emojiSelectorSmallButton');
  addClass(el, 'hide');
}

function showEmojiPanel(input) {
  var el = document.querySelector('#emojiSelector');
  var pos = getOffset(input);
  removeClass(el, 'hide');
  if (getFixedParent(input) != null)
    el.style.position = 'fixed';
  else
    el.style.position = 'absolute';
  if (pos.left + el.clientWidth > document.documentElement.clientWidth)
    pos.left = document.documentElement.clientWidth - el.clientWidth;
  var newY = pos.top - el.clientHeight;
  if (newY < 0)
    newY = pos.top + input.clientHeight;
  //if (newY > document.documentElement.clientHeight)
  //  newY = document.documentElement.clientHeight - el.clientHeight;
  el.style.top  = newY + 'px';
  el.style.left = pos.left + 'px';
  emojiPanelOpen = input;
  createRecentUsedList(emojiHistory, emojiSearch);
  //document.querySelector('#emojiSelector input[type=search]').focus() // twitter like behaviour. <- make this only when the dialog doesnt open on click but maybe after a face button has been clicked?
}

function hideEmojiPanel() {
  var el = document.querySelector('#emojiSelector');
  addClass(el, 'hide');
  if (emojiPanelOpen != false) {
    emojiPanelOpen.selectionEnd = emojiPanelOpen.selectionStart; // prevent input from being selected (blue)
    emojiPanelOpen.focus();
  }
  emojiPanelOpen = false;
}

function createRecentUsedList(list, search) {
  var e = document.querySelector('#emojiSelectorHistory');
  if (e == undefined) return;
  var s = '<h1 id="emojiSelectorCatAnchor-0">Recently used <button id="emojiSelectorClearRecent" class="btn-flat red darken-2" title="clear the list of recently used emojis">clear</button></h1>'
        + '<div class="emojiGrid">';
  let count = 0;
  list.forEach(x => {
    if (search == undefined || search == '' || emojiSelectorEmojiData.emojis[x].name.join('').indexOf(search) >= 0) {
      s += '<button class="pick" title="' + emojiSelectorEmojiData.emojis[x].name[0] + '">' + x + '</button>';
      count++;
    }
  });
  e.innerHTML = s + '</div>';
  if (list.length == 0 || count == 0)
    addClass(e, 'hide');
  else
    removeClass(e, 'hide');
  makeButtonsClickable(e);

  var clearButton = e.querySelector('#emojiSelectorClearRecent');
  if (clearButton != null) {
    clearButton.onclick = () => {
      emojiHistory = [];
      chrome.storage.local.clear();
      createRecentUsedList(emojiHistory);
    };
  }
}

function makeButtonsClickable(parent) {
  if (parent == null)
    parent = document.querySelector('#emojiSelector');
  var emojiButtons = parent.querySelectorAll('button.pick');
  for (let x of emojiButtons) {
    x.onclick = (e) => {
      //alert(emojiPanelOpen)
      var e = emojiPanelOpen; // global var for currently focused input
      var t = e.selectionStart; // when adding a smilie the e.selectionStart jumps to the end instead of staying were it was
      e.value = e.value.substring(0, t) + x.innerHTML + e.value.substring(t, e.value.length);
      e.selectionStart = t + x.innerHTML.length;

      if (emojiHistory.indexOf(x.innerHTML) >= 0) // if already in list remove and put to front
        emojiHistory.splice(emojiHistory.indexOf(x.innerHTML), 1);
      emojiHistory.unshift(x.innerHTML);
      if (emojiHistory.length > 10)
        emojiHistory.pop();
      //alert(emojiHistory)
      chrome.storage.local.set({'history': emojiHistory});

      createRecentUsedList(emojiHistory);

      document.querySelector('#emojiSelector input[type=search]').focus(); // twitter selector like behavior: while its open the focus is on search field
    };
  }
}

/****************************************************************************
 *
 ****************************************************************************/

 // get offset relative to rel element. rel = document if not set
function getOffset(el, rel) {
	if (rel == undefined)
    rel = document.documentElement;
  var rect = el.getBoundingClientRect();
  if (getFixedParent(el) != null)
    return rect;
  var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
      scrollTop  = window.pageYOffset || document.documentElement.scrollTop,
	       relLeft = rel.getBoundingClientRect().left,
	       relTop  = rel.getBoundingClientRect().top;
  return { top: rect.top + scrollTop - relTop, left: rect.left + scrollLeft - relLeft }
}

function getOffsetA(el, rel) {
  // find out if a parentElement is position: fixed;

  // relative to what should the offset be calculated? documentELement or something else?
	if (rel == undefined)
    rel = document.documentElement;
  var rect = el.getBoundingClientRect(),
  scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
  scrollTop  = window.pageYOffset || document.documentElement.scrollTop,
	relLeft = rel.getBoundingClientRect().left,
	relTop  = rel.getBoundingClientRect().top;
  return { top: rect.top + scrollTop - relTop, left: rect.left + scrollLeft - relLeft }
}

function getFixedParent(el) {
  while (el != null) {
    //alert(pel.style.position)
    if (window.getComputedStyle(el).position == 'fixed')
      return el;
    el = el.parentElement;
  }
  return null;
}

function hasClass(el, className) {
  if (el.classList)
    return el.classList.contains(className)
  else
    return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
}

function addClass(el, className) {
  if (el.classList)
    el.classList.add(className)
  else if (!hasClass(el, className)) el.className += " " + className
}

function removeClass(el, className) {
  if (el.classList)
    el.classList.remove(className)
  else if (hasClass(el, className)) {
    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
    el.className=el.className.replace(reg, ' ')
  }
}
