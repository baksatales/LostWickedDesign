import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/dom';
import BaksaApp from '../src/pages/BaksaApp';
import { starterDocument } from '../src/pages/starter-document';
import type { SiteDocument } from '@workspace/api-client-react';

const state=vi.hoisted(()=>({document:undefined as SiteDocument|undefined}));
vi.mock('@workspace/api-client-react',async importOriginal=>{
  const actual=await importOriginal<typeof import('@workspace/api-client-react')>();
  return {
    ...actual,
    useGetSite:()=>({data:{document:state.document},isLoading:false}),
    useGetCatalog:()=>({data:{products:[],makers:[],sample:true},isLoading:false}),
    useGetRuntime:()=>({data:{auth:false},isLoading:false}),
    useGetWorkspace:()=>({data:undefined,isLoading:false}),
  };
});

let root:Root;
let container:HTMLDivElement;
let queryClient:QueryClient;
let location:ReturnType<typeof memoryLocation>;
let user:ReturnType<typeof userEvent.setup>;
const request=vi.fn();

beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  state.document=starterDocument();
  queryClient=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  container=document.createElement('div');
  document.body.append(container);
  root=createRoot(container);
  location=memoryLocation({path:'/corporate',record:true});
  user=userEvent.setup({document});
  vi.stubGlobal('fetch',request);
});

afterEach(async()=>{
  await act(async()=>root.unmount());
  queryClient.clear();
  container.remove();
  vi.unstubAllGlobals();
  request.mockReset();
});

async function renderBrief(){
  await act(async()=>root.render(<QueryClientProvider client={queryClient}><Router hook={location.hook}><BaksaApp/></Router></QueryClientProvider>));
}
function input(label:RegExp){const node=within(container).getByLabelText(label);expect(node).toBeInstanceOf(HTMLInputElement);return node as HTMLInputElement}

test('corporate brief sends per-gift paise, chosen purpose, reach and optional detail to the API',async()=>{
  request.mockResolvedValueOnce(new Response(JSON.stringify({id:'brief-42',message:'Your brief is received.'}),{status:201,headers:{'content-type':'application/json'}}));
  await renderBrief();
  await user.click(within(container).getByRole('button',{name:'Client appreciation'}));
  await user.type(input(/How many gifts/),'24');
  await user.type(input(/Budget per gift/),'1375');
  await user.type(input(/Needed by/),'2030-06-20');
  await user.type(input(/Your name/),'Mira Rao');
  await user.type(input(/Company or organisation/),'Juniper House');
  await user.type(input(/Work email or Indian mobile/),'mira@juniper.example');
  await user.click(within(container).getByText('Add more detail (optional)'));
  await user.type(within(container).getByLabelText(/Customisation/),'A short note in each box');
  await user.type(within(container).getByLabelText(/Delivery cities/),'Delhi, Jaipur');
  await user.type(within(container).getByLabelText(/Reference link/),'https://juniper.example/gifts');
  await user.type(within(container).getByLabelText(/Anything else/),'Muted colours, if possible');
  await user.click(within(container).getByRole('button',{name:/Send my brief/}));

  await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));
  const [url,init]=request.mock.calls[0] as [string,RequestInit];
  expect(url).toBe('/api/corporate');
  expect(init.method).toBe('POST');
  const body=JSON.parse(String(init.body));
  expect(body).toMatchObject({
    purpose:'Client appreciation',quantity:24,budgetPaise:137500,neededBy:'2030-06-20',
    contactName:'Mira Rao',company:'Juniper House',reach:'mira@juniper.example',
    email:'mira@juniper.example',customization:'A short note in each box',
    deliveryCities:'Delhi, Jaipur',referenceUrl:'https://juniper.example/gifts',
    message:'Muted colours, if possible',
  });
  expect(within(container).getByRole('status').textContent).toContain('brief-42');
  expect(within(container).getByText('Your brief is received.')).toBeTruthy();
});

test('a rejected brief keeps every entered value available for correction and retry',async()=>{
  request.mockResolvedValueOnce(new Response(JSON.stringify({error:'Please choose a later date.'}),{status:400,headers:{'content-type':'application/json'}}));
  await renderBrief();
  await user.type(input(/A few words about the occasion/),'Team welcome');
  await user.type(input(/How many gifts/),'18');
  await user.type(input(/Budget per gift/),'900');
  await user.type(input(/Needed by/),'2030-07-11');
  await user.type(input(/Your name/),'Anika Shah');
  await user.type(input(/Company or organisation/),'Northstar Studio');
  await user.type(input(/Work email or Indian mobile/),'+91 98765 43210');
  await user.click(within(container).getByText('Add more detail (optional)'));
  await user.type(within(container).getByLabelText(/Customisation/),'Printed maker story');
  await user.click(within(container).getByRole('button',{name:/Send my brief/}));

  await waitFor(()=>expect(container.textContent).toContain('Please choose a later date.'));
  expect(input(/A few words about the occasion/).value).toBe('Team welcome');
  expect(input(/How many gifts/).value).toBe('18');
  expect(input(/Budget per gift/).value).toBe('900');
  expect(input(/Needed by/).value).toBe('2030-07-11');
  expect(input(/Your name/).value).toBe('Anika Shah');
  expect(input(/Company or organisation/).value).toBe('Northstar Studio');
  expect(input(/Work email or Indian mobile/).value).toBe('+91 98765 43210');
  expect((within(container).getByLabelText(/Customisation/) as HTMLTextAreaElement).value).toBe('Printed maker story');
});
