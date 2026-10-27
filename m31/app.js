'use strict';
// Compatibility entry for cached pre-NEXUS pages; no legacy UI or storage writes.
location.replace(location.pathname+'?v=nexus-'+Date.now()+(location.hash||'#work'));
