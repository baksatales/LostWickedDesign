import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BaksaApp from '../src/pages/BaksaApp';
import { starterDocument } from '../src/pages/starter-document';
import type { SiteDocument } from '@workspace/api-client-react';

const state=vi.hoisted(()=>({
  path:'/',
  site:undefined as {document:SiteDocument;configured?:boolean}|undefined,
  error:false,
}));

vi.mock('wouter',async importOriginal=>{
  const actual=await importOriginal<typeof import('wouter')>();
  return {...actual,useLocation:()=>[state.path,vi.fn()]};
});
vi.mock('@workspace/api-client-react',async importOriginal=>{
  const actual=await importOriginal<typeof import('@workspace/api-client-react')>();
  return {
    ...actual,
    useGetSite:()=>({data:state.site,isError:state.error,refetch:vi.fn()}),
    useGetCatalog:()=>({data:undefined,isError:false,refetch:vi.fn()}),
    useGetRuntime:()=>({data:{auth:false},isLoading:false}),
    useGetWorkspace:()=>({data:undefined,isLoading:false}),
  };
});

let root:Root|undefined;
let container:HTMLDivElement;
const track=vi.fn();
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});

async function render(){
  if(!root){
    container=document.createElement('div');
    document.body.append(container);
    root=createRoot(container);
  }
  await act(async()=>root!.render(<QueryClientProvider client={client}><BaksaApp/></QueryClientProvider>));
}

afterEach(async()=>{
  if(root)await act(async()=>root!.unmount());
  root=undefined;
  document.body.innerHTML='';
  client.clear();
  state.site=undefined;
  state.error=false;
  track.mockClear();
  delete window.umami;
});

function beginStory(){
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  window.umami={track};
  const doc=starterDocument();
  state.path=`/stories/${doc.stories[0].id}`;
  return doc;
}

test('a direct visit never opens the starter story while published content is loading or hidden',async()=>{
  const doc=beginStory();
  await render();
  expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  expect(container.querySelector('.bk-story-page')).toBeNull();
  expect(track).not.toHaveBeenCalled();
  doc.stories[0].visible=false;
  state.site={document:doc};
  await render();
  expect(container.textContent).toContain('This chapter is not available.');
  expect(track).not.toHaveBeenCalled();
});

test('a reordered story is counted once using only published position and flags',async()=>{
  const doc=beginStory();
  await render();
  expect(track).not.toHaveBeenCalled();
  const story=doc.stories.shift()!;
  story.sponsored=true;
  story.sample=false;
  doc.stories.push(story);
  state.site={document:doc};
  await render();
  expect(container.querySelector('.bk-story-page')).not.toBeNull();
  expect(track.mock.calls).toEqual([['story_opened',{
    story_position:doc.stories.length,sponsored:true,sample:false,
  }]]);
  await render();
  expect(track).toHaveBeenCalledTimes(1);
});

test('the API-provided default still opens stories when the site is unconfigured',async()=>{
  const doc=beginStory();
  await render();
  state.site={document:doc,configured:false};
  await render();
  expect(track).toHaveBeenCalledWith('story_opened',{
    story_position:1,sponsored:doc.stories[0].sponsored,sample:doc.stories[0].sample,
  });
});

test('failed site loading does not measure a default story',async()=>{
  beginStory();
  await render();
  state.error=true;
  await render();
  expect(container.textContent).toContain('We could not load the published site content.');
  expect(track).not.toHaveBeenCalled();
});

test('the home trunk waits for published content and counts opening but not closing',async()=>{
  const doc=beginStory();
  state.path='/';
  await render();
  expect(container.querySelector('.bk-trunk-toggle')).toBeNull();
  state.site={document:doc};
  await render();
  const button=container.querySelector<HTMLButtonElement>('.bk-trunk-toggle')!;
  await act(async()=>button.click());
  await act(async()=>button.click());
  expect(track.mock.calls).toEqual([['trunk_opened',undefined]]);
});
