// @flow
import * as React from 'react';
import { TooltipTrigger } from 'pui-react-tooltip';
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  .tooltip:hover .tooltip-container:not(.tooltip-container-hidden){
    visibility:visible;
    opacity:1
  }
  .tooltip-container{
    visibility:hidden;
    -webkit-transition:opacity ease-out 0.2s;
    transition:opacity ease-out 0.2s;
    z-index:10;
    position:absolute;
    bottom:100%;
    left:50%;
    -webkit-transform:translateX(-50%);
    transform:translateX(-50%);
    margin:0 0 8px 0;
    text-align:left
  }
  .tooltip-container.tooltip-container-visible{
    visibility:visible
  }
  .tooltip-container.tooltip-hoverable:after{
    content:"";
    position:absolute;
    width:calc(100% + 16px);
    height:calc(100% + 16px);
    top:50%;
    left:50%;
    -webkit-transform:translateX(-50%) translateY(-50%);
    transform:translateX(-50%) translateY(-50%)
  }
  .tooltip-container .tooltip-content{
    white-space:nowrap;
    padding:4px 8px;
    font-size:12px;
    line-height:16px;
    font-weight:400;
    letter-spacing:0;
    text-transform:none;
    background-color:${props => props.theme.tooltipBackground};
    color: ${props => props.theme.tooltipText};
    border-radius:2px;
    border:1px solid ${props => props.theme.tooltipBackground};
    box-shadow:0px 2px 2px 0px rgba(36, 54, 65, .1),0px 0px 2px 0px rgba(36, 54, 65, .1)
  }
  .tooltip-container .tooltip-content:before{
    content:"";
    z-index:1;
    position:absolute;
    bottom:-4px;
    left:50%;
    -webkit-transform:translateX(-50%) rotateZ(45deg);
    transform:translateX(-50%) rotateZ(45deg);
    background-color:${props => props.theme.tooltipBackground};
    border-bottom:1px solid ${props => props.theme.tooltipBackground};
    border-right:1px solid ${props => props.theme.tooltipBackground};
    width:8px;
    height:8px
  }
  .tooltip-container .tooltip-content:after{
    content:"";
    box-sizing:content-box;
    z-index:-1;
    position:absolute;
    bottom:-4px;
    left:50%;
    -webkit-transform:translateX(-50%) rotateZ(45deg);
    transform:translateX(-50%) rotateZ(45deg);
    background-color:${props => props.theme.tooltipBackground};
    box-shadow:0px 2px 2px 0px rgba(36, 54, 65, .1),0px 0px 2px 0px rgba(36, 54, 65, .1);
    width:8px;
    height:8px
  }
  .tooltip{
    position:relative;
    display:inline-block
  }
  .tooltip.tooltip-bottom .tooltip-container{
    top:100%;
    bottom:auto;
    left:50%;
    -webkit-transform:translateX(-50%);
    transform:translateX(-50%);
    margin:8px 0 0 0
  }
  .tooltip.tooltip-bottom .tooltip-container .tooltip-content:before{
    bottom:auto;
    top:-4px;
    border-top:1px solid ${props => props.theme.tooltipBackground};
    border-right:none;
    border-bottom:none;
    border-left:1px solid ${props => props.theme.tooltipBackground}
  }
  .tooltip.tooltip-bottom .tooltip-container .tooltip-content:after{
    bottom:auto;
    top:-4px
  }
  .tooltip.tooltip-right .tooltip-container{
    top:50%;
    bottom:auto;
    left:100%;
    -webkit-transform:translatey(-50%);
    transform:translatey(-50%);
    margin:0 0 0 8px
  }
  .tooltip.tooltip-right .tooltip-container .tooltip-content:before{
    bottom:auto;
    left:-4px;
    top:50%;
    -webkit-transform:translatey(-50%) rotateZ(45deg);
    transform:translatey(-50%) rotateZ(45deg);
    border-top:none;
    border-right:none;
    border-bottom:1px solid ${props => props.theme.tooltipBackground};
    border-left:1px solid ${props => props.theme.tooltipBackground}
  }
  .tooltip.tooltip-right .tooltip-container .tooltip-content:after{
    bottom:auto;
    left:-4px;
    top:50%;
    -webkit-transform:translatey(-50%) rotateZ(45deg);
    transform:translatey(-50%) rotateZ(45deg)
  }
  .tooltip.tooltip-left .tooltip-container{
    top:50%;
    bottom:auto;
    right:100%;
    left:auto;
    -webkit-transform:translatey(-50%);
    transform:translatey(-50%);
    margin:0 8px 0 0
  }
  .tooltip.tooltip-left .tooltip-container .tooltip-content:before{
    bottom:auto;
    right:-4px;
    left:auto;
    top:50%;
    -webkit-transform:translatey(-50%) rotateZ(45deg);
    transform:translatey(-50%) rotateZ(45deg);
    border-top:1px solid ${props => props.theme.tooltipBackground};
    border-right:1px solid ${props => props.theme.tooltipBackground};
    border-bottom:none;
    border-left:none
  }
  .tooltip.tooltip-left .tooltip-container .tooltip-content:after{
    bottom:auto;
    right:-4px;
    left:auto;
    top:50%;
    -webkit-transform:translatey(-50%) rotateZ(45deg);
    transform:translatey(-50%) rotateZ(45deg)
  }
  .tooltip-sm.tooltip-container{
    width:120px
  }
  .tooltip-sm.tooltip-container .tooltip-content{
    white-space:normal
  }
  .tooltip-md.tooltip-container{
    width:240px
  }
  .tooltip-md.tooltip-container .tooltip-content{
    white-space:normal
  }
  .tooltip-lg.tooltip-container{
    width:360px
  }
  .tooltip-lg.tooltip-container .tooltip-content{
    white-space:normal
  }
  .tether-element{
    z-index:99
  }
  .overlay-trigger{
    color:#1B78B3;
    -webkit-transition:all 300ms ease-out;
    transition:all 300ms ease-out;
    -webkit-transition-property:background-color, color, opacity;
    transition-property:background-color, color, opacity
  }
  .overlay-trigger:hover,.overlay-trigger:focus{
    color:#1f8ace;
    cursor:pointer;
    outline:none;
    text-decoration:none
  }
  .overlay-trigger:active,.overlay-trigger.active{
    color:#176698
  }
`;

const Tooltip = function(props: *) {
  return (
    <React.Fragment>
      <GlobalStyles />
      <TooltipTrigger {...props} />
    </React.Fragment>
  );
};

export default Tooltip;
