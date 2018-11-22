// ==UserScript==
// @name          Slack IRC layout
// @namespace     http://userstyles.org
// @description	  Mimics a terminal IRC client in slack
// @author        Joseph Lennox
// @homepage      https://github.com/jlennox/SlackIRCLayout
// @include       https://slack.com/*
// @include       https://*.slack.com/*
// @run-at        document-start
// @version       1.0
// ==/UserScript==

/* User settings */
const truncateLongNames = true;
const maxNameLength = "80px";
const bodyZoom = "80%";
/* End user settings */

const query = (x, y) => y.querySelector(x);
const queryAll = (x, y) => y.querySelectorAll(x);

const ansiColors = [
    "rgb(255,255,255)",
    "rgb(0,0,0)",
    "rgb(0,0,127)",
    "rgb(0,147,0)",
    "rgb(255,0,0)",
    "rgb(127,0,0)",
    "rgb(156,0,156)",
    "rgb(252,127,0)",
    "rgb(255,255,0)",
    "rgb(0,252,0)",
    "rgb(0,147,147)",
    "rgb(0,255,255)",
    "rgb(0,0,252)",
    "rgb(255,0,255)",
    "rgb(127,127,127)",
    "rgb(210,210,210)"];

// Which ansi color indexes have bad contrast on a white background and should not be used.
const ansiBadForWhite = { 0: true, 8: true, 11: true, 14: true, 15: true };

// Marks an element as modified to know that it should not be checked in future DOM events.
const markerClass = "slackirc--has-been-modified";

const stringAnsiColorCache = {};
let myUsername = undefined;

// Create a DOM text node.
function __t(text, parent)
{
    const el = document.createTextNode(text);
    if (parent) { parent.appendChild(el); }
    return el;
}

// Create a DOM element.
function __e(elementType, parent)
{
    const el = document.createElement(elementType);
    if (parent) { parent.appendChild(el); }
    return el;
}

function getElementText(el)
{
    return ((el && el.innerText) || "").trim();
}

function queryText(selector, parent)
{
    return getElementText(query(selector, parent));
}

function padLeft(s, chr, count)
{
    s = (s || "").toString();

    const padding = count > s.length
        ? new Array(count - s.length + 1).join(chr)
        : "";

    return padding + s;
}

function stringify(o)
{
    if (typeof s == "string")
    {
        return o;
    }

    return o === null || o === undefined
        ? "" : o.toString();
}


// Based on https://stackoverflow.com/a/7616484/1392539
function stringHash(s)
{
    s = stringify(s);

    let hash = 5381;
    for (let i = 0; i < s.length; ++i)
    {
        const chr = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function stringAnsiColor(s)
{
    let cached = stringAnsiColorCache[s];

    if (!cached)
    {
        cached = stringAnsiColorCore(s);
        stringAnsiColorCache[s] = cached;
    }

    return cached;
}

function stringAnsiColorCore(s)
{
    let hash = Math.abs(stringHash(s));
    while (true)
    {
        const ansiIndex = hash % ansiColors.length;

        if (!ansiBadForWhite[ansiIndex])
        {
            return ansiColors[ansiIndex];
        }

        hash = stringHash(hash + ansiIndex);
    }
}

function getMyUsername()
{
    if (!myUsername)
    {
        myUsername = queryText("#team_menu_user_details .current_user_name", document.body);
    }

    return myUsername;
}

function updateMessageElement(target)
{
    target.classList.add(markerClass);

    const timeInput = queryText(".c-timestamp__label", target);
    const messageElement = query(".c-message__body", target);

    if (!timeInput || !messageElement)
    {
        return;
    }

    const containerElement = query(".c-message", target);

    const messageHtml = messageElement.innerHTML;
    const isActionText = messageElement.classList.contains("c-message__body--me");
    const isAutomatedText = messageElement.classList.contains("c-message__body--automated");
    const isAdjacentText = messageElement.classList.contains("c-message--adjacent");
    const formatAsAction = isActionText || isAutomatedText;

    // Slack skips the names on "adjacent" elements so we have to recursively backtrack until
    // a name is found. This is not always successful.
    let senderLinkElement = undefined;
    let sender = "";
    let currentSenderTarget = target;
    while (currentSenderTarget && !sender)
    {
        const ourSenderElement = query(".slackirc--name", currentSenderTarget);

        if (ourSenderElement)
        {
            sender = getElementText(ourSenderElement);
            senderLinkElement = ourSenderElement;
            break;
        }

        sender = queryText(".c-message__sender", currentSenderTarget);
        senderLinkElement = query(".c-message__sender_link", currentSenderTarget);

        currentSenderTarget = currentSenderTarget.previousElementSibling;
    }

    const senderUrl = senderLinkElement ? senderLinkElement.href : undefined;
    const isMe = sender == getMyUsername();

    const newMessageElement = createMessageElement({
        sender: sender,
        formatAsAction: formatAsAction,
        senderUrl: senderUrl,
        formattedTime: timeInput,
        messageHtml: messageHtml,
        isAdjacentText: isAdjacentText,
        isMe: isMe
    });

    target.appendChild(newMessageElement);

    containerElement.parentElement.removeChild(containerElement);
}

// Replace the body of this method for alternative layouts.
function createMessageElement(info)
{
    const sender = info.sender;
    const formatAsAction = info.formatAsAction;
    const senderUrl = info.senderUrl;
    const formattedTime = info.formattedTime;
    const messageHtml = info.messageHtml;
    const isAdjacentText = info.isAdjacentText;
    const isMe = info.isMe;

    const newline = __e("div");
    newline.classList.add("slackirc--new-message-line");
    newline.classList.add(markerClass);
    newline.classList.add("c-message");
    newline.classList.add("c-message--light");
    newline.classList.add(formatAsAction ? "slackirc--is-action" : "slackirc--is-normal");
    if (isAdjacentText)
    {
        newline.classList.add("slackirc--is-adjacent");
    }

    __t(`[${formattedTime}] `, newline);

    const nameContainer = __e("span", newline);
    nameContainer.classList.add("slackirc--name-container");

    if (sender)
    {
        if (formatAsAction)
        {
            __t(`${sender} `, nameContainer);
        }
        else
        {
            const openBracket = __e("span", nameContainer);
            __t("<", openBracket);
            openBracket.style.color = ansiColors[10];

            const senderEl = __e("a", nameContainer);
            __t(sender, senderEl);
            senderEl.classList.add("slackirc--name");
            if (isMe)
            {
                senderEl.style.fontWeight = "bold";
                senderEl.style.textDecoration = "underline";
            }
            senderEl.style.color = stringAnsiColor(sender);
            senderEl.href = senderUrl;
            senderEl.title = sender;

            const closeBracket = __e("span", nameContainer);
            __t(">", closeBracket);
            closeBracket.style.color = ansiColors[10];
        }
    }

    const messageSpan = __e("span", newline);
    messageSpan.classList.add("slackirc--message-container");
    messageSpan.innerHTML = messageHtml;

    return newline;
}

function reformatMessages(targets)
{
    if (!targets || targets.length == 0)
    {
        return;
    }

    for (let i = 0; i < targets.length; ++i)
    {
        const listItems = getListItems(targets[i]);

        if (!listItems)
        {
            continue;
        }

        for (let j = 0; j < listItems.length; ++j)
        {
            const listitem = listItems[j];

            if (!isListItem(listitem))
            {
                continue;
            }

            updateMessageElement(listitem);
        }
    }
}

function isListItem(element)
{
    if (element &&
        element.attributes &&
        element.attributes.role &&
        element.attributes.role.value == "listitem" &&
        (!element.classList ||
         !element.classList.contains(markerClass)))
    {
        return true;
    }

    return false;
}

function getListItems(target)
{
    if (!target || !target.querySelectorAll)
    {
        return undefined;
    }

    if (isListItem(target))
    {
        return [target];
    }

    return target.querySelectorAll(`[role=listitem]:not(.${markerClass})`);
}

function initAttach()
{
    insertCSS();

    const observer = new MutationObserver((mutations) =>
    {
        mutations.forEach((mutation) =>
        {
            reformatMessages(mutation.addedNodes);
        });
    });

    const config = { childList: true, subtree: true };

    observer.observe(document.body, config);

    reformatMessages([document.body]);
}

function insertCSS()
{
    const css = `
    .slackirc--new-message-line {
        margin-left: 5px;
        font-family: "Fixedsys", "Ubuntu Mono", Monospace;
        padding: 0px !important;
        line-height: 1.2em;
        user-select: text;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
    }

    .slackirc--new-message-line:not(.slackirc--is-adjacent) {
        padding-top: 3px !important;
    }

    .slackirc--is-normal .slackirc--name-container {
        ${truncateLongNames ? "width" : "min-width"}: ${maxNameLength};
        display: inline-block;
        overflow-x: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        flex-shrink: 0;
    }

    .slackirc--name-container {
        margin-left: .5em;
        margin-right: .5em;
    }

    .slackirc--message-container {
        flex-shrink: 1;
        margin-right: 20px;
        word-break: break-word;
    }

    .slackirc--is-action .slackirc--message-container,
    .slackirc--is-action .slackirc--name-container
    {
        color: ${ansiColors[6]};
        font-style: italic;
    }

    /* Modifications to existing elements. */

    body {
        zoom: ${bodyZoom};
    }

    body .c-scrollbar__bar {
        opacity: 1;
        border-radius: 0px;
    }

    .channel_page_about,
    .channel_page_highlights,
    .channel_page_pinned_items,
    .channel_page_shared_files,
    .channel_page_notif_prefs,
    .channel_page_members .channel_page_member_tabs {
        display: none;
    }

    #client_body [role=complementary] { flex-basis: 200px; }
    .channel_page_members .member_image { display: none; }`;

    const styleNode = __e("style");
    styleNode.type = "text/css";
    styleNode.id = "__SlackIRCLayout__";

    if (styleNode.styleSheet)
    {
        styleNode.styleSheet.cssText = css;
    }
    else
    {
        styleNode.appendChild(document.createTextNode(css));
    }

    if (document.head)
    {
        document.head.appendChild(styleNode);
    }
    else
    {
        document.documentElement.appendChild(styleNode);
    }
}

if (document.body && document.readyState != "loading")
{
    initAttach();
}
else
{
    document.addEventListener("DOMContentLoaded", () => initAttach());
}