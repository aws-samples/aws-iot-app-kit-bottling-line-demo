/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { useState } from "react";
import { AppLayout, BreadcrumbGroup, Container, Grid, Header, TopNavigation } from "@awsui/components-react";
/* --- BEGIN: AWS @iot-app-kit and related imports*/
import { initialize } from "@iot-app-kit/source-iotsitewise";
import { fromEnvReactApp } from "./fromEnv";
import { BarChart, LineChart, StatusTimeline, ResourceExplorer, WebglContext, StatusGrid, Kpi } from "@iot-app-kit/react-components";
import { COMPARISON_OPERATOR } from '@synchro-charts/core';

import "./App.css";

const { defineCustomElements } = require("@iot-app-kit/components/loader");

const { query } = initialize({
    awsCredentials: fromEnvReactApp(),
    awsRegion: "us-east-1",
});

defineCustomElements();
/* --- END: AWS @iot-app-kit and related imports*/

function Breadcrumbs() {
    const breadcrumbItems = [
        {
            text: 'Bottling Line',
            href: '#'
        },
        {
            text: 'Machine Dashboard',
            href: '#'
        }
    ];

    return <BreadcrumbGroup items={breadcrumbItems} expandAriaLabel="Show path" ariaLabel="Breadcrumbs"/>;
}

function PageHeader() {
    return <Header variant="h1">Machine Dashboard</Header>;
}

function SitwiseResourceExplorer(props: any) {
    const columnDefinitions = [{
        sortingField: 'name',
        id: 'name',
        header: 'Asset Name',
        cell: ({ name }: any) => name,
    }];

    return (
        <Container 
            disableContentPaddings={true}
            header={ <Header variant="h2" description="List of SiteWise assets"> Bottling Line Machines </Header> }
        >
            {/* --- BEGIN: `ResourceExplorer` implementation*/}
            <ResourceExplorer
                query={query.assetTree.fromRoot()}
                onSelectionChange={(event) => {
                    console.log("changes asset", event);
                    props.setAssetId((event?.detail?.selectedItems?.[0] as any)?.id);
                    props.setAssetName((event?.detail?.selectedItems?.[0] as any)?.name);
                }}
                columnDefinitions={columnDefinitions}
            />
            {/* --- END: `ResourceExplorer` implementation*/}
        </Container>
    );
}

function MachineState(props: any) {
    return (
        <Container
            disableContentPaddings={true}
            header={ <Header variant="h2" description="Operational state of the machine as timeline"> Machine State </Header> }
        >
            {/* --- BEGIN: `StatusTimeline` implementation*/}
            <div style={{ height: "170px" }}>
                <StatusTimeline
                    viewport={{ duration: '15m' }}
                    annotations={{
                        y: [
                            { color: '#1D8102', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'PRODUCING' },
                            { color: '#0073BB', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'IDLE' },
                            { color: '#D45200', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'STARVED' },
                            { color: '#DA4976', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'BLOCKED' },
                            { color: '#5951D6', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'CHANGEOVER' },
                            { color: '#455A64', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'STOPPED' },
                            { color: '#AB1D00', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'FAULTED' }
                        ]
                    }}
                    queries={[
                        query.timeSeriesData({
                            assets: [{
                                assetId: props.assetId,
                                properties: [{
                                    propertyId: props.machineStatePropertyId
                                }]
                            }]
                        })
                    ]}
                />
            </div>
            {/* --- END: `StatusTimeline` implementation*/}
        </Container>
    );
}

function ProductionCount(props: any) {
    return (
        <Container disableContentPaddings={true} header={ <Header variant="h2" description="Count of total and bad output from machine"> Production Count </Header> } >
            {/* --- BEGIN: `LineChart` implementation*/}
            <div style={{ height: "170px" }}>
                <LineChart
                    viewport={{ duration: "15m" }}
                    queries={[
                        query.timeSeriesData({
                            assets: [
                                {
                                    assetId: props.assetId,
                                    properties: [
                                        {
                                            propertyId: props.badPartsCountPropertyId,
                                            refId: 'bad-parts-count'
                                        },
                                        {
                                            propertyId: props.totalPartsCountPropertyId,
                                            refId: 'total-parts-count'
                                        }
                                    ]
                                }
                            ]
                        })
                    ]}
                    styleSettings={{
                        'bad-parts-count': { color: '#D13212', name: 'Bad Count' },
                        'total-parts-count': { color: '#1D8102', name: 'Total Count' }
                    }}
                />
            </div>
            {/* --- END: `LineChart` implementation*/}
        </Container>
    );
}

function MachineMode(props: any) {
    return (
        <Container disableContentPaddings={true} header={ <Header variant="h2" description="The current operational status of the machine"> {props.assetName} </Header> } >
            <div style={{ height: "170px" }}>
                <StatusGrid
                    viewport={{ duration: "15m" }}
                    annotations={{ 
                        y: [
                            { color: '#1D8102', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'AUTOMATIC' },
                            { color: '#D45200', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'MAINTENANCE' },
                            { color: '#0073BB', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'MANUAL' },
                            { color: '#AB1D00', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'YES' },
                            { color: '#1D8102', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 'NO' },
                        ] 
                    }}
                    queries={[
                        query.timeSeriesData({
                            assets: [
                                {
                                    assetId: props.assetId,
                                    properties: [
                                        {
                                            propertyId: props.machineModePropertyId
                                        },
                                        {
                                            propertyId: props.starvedPropertyId
                                        },
                                        {
                                            propertyId: props.blockedPropertyId
                                        }
                                    ],
                                },
                            ],
                        }),
                    ]}
                />
            </div>
        </Container>
    );
}

function MachineSpeed(props: any) {
    return (
        <Container disableContentPaddings={true} header={ <Header variant="h2" description="Current operational speed in bottles processed per minute"> Machine Speed </Header> } >
            <div style={{ height: "170px" }}>
                <BarChart
                    viewport={{ duration: "15m" }}
                    queries={[
                        query.timeSeriesData({
                            assets: [
                                {
                                    assetId: props.assetId,
                                    properties: [
                                        {
                                            propertyId: props.machineSpeedPropertyId,
                                            refId: 'machine-speed'
                                        }
                                    ],
                                },
                            ],
                        }),
                    ]}
                    styleSettings={{
                        'machine-speed': { color: '#0073BB', name: 'Current Machine Speed' }
                    }}
                />
            </div>
        </Container>
    );
}

function ProductionStatus(props: any) {
    return (
        <Container disableContentPaddings={true} header={ <Header variant="h2" description="Production stats for the machine"> Production Statistics </Header> } >
            <div style={{ height: "170px" }}>
                <Kpi
                    viewport={{ duration: "15m" }}
                    queries={[
                        query.timeSeriesData({
                            assets: [
                                {
                                    assetId: props.assetId,
                                    properties: [
                                        {
                                            propertyId: props.badPartsCountPropertyId
                                        },
                                        {
                                            propertyId: props.totalPartsCountPropertyId
                                        }
                                    ],
                                },
                            ],
                        }),
                    ]}
                />
            </div>
        </Container>
    );
}

function StopHistory(props: any) {
    return (
        <Container disableContentPaddings={true} header={ <Header variant="h2" description="Stop reason codes as timeline"> Stop History </Header> } >
            <div style={{ height: "170px" }}>
                <StatusTimeline
                    viewport={{ duration: '15m' }}
                    annotations={{ 
                        y: [
                            { color: '#1D8102', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 0 },
                            { color: '#FFC991', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 100 },
                            { color: '#F7AE24', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 110 },
                            { color: '#DB6A23', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 120 },
                            { color: '#D65199', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 130 },
                            { color: '#7B9DAE', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 140 },
                            { color: '#455A64', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 150 },
                            { color: '#0EB3C7', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 160 },
                            { color: '#0077D9', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 200 },
                            { color: '#4F5C8E', comparisonOperator: COMPARISON_OPERATOR.EQUAL, value: 220 },
                        ] 
                    }}
                    queries={[
                        query.timeSeriesData({
                            assets: [{
                                assetId: props.assetId,
                                properties: [{
                                    propertyId: props.stopReasonPropertyId
                                }]
                            }]
                        })
                    ]}
                />
            </div>
        </Container>
    );
}

function Content() {
    /* --- BEGIN: Asset Id and Asset Property Ids from AWS IoT SiteWise*/
    
    // Asset Id of the AWS IoT SiteWise asset that you want to display by default
    const DEFAULT_MACHINE_ASSET_ID = '<replace-with-sitwise-asset-id>';
    const [ assetId, setAssetId ] = useState(DEFAULT_MACHINE_ASSET_ID);
    const [ assetName, setAssetName ] = useState('<replace-with-corresponding-sitwise-asset-name>');
    
    // Asset Property Ids of the AWS IoT SiteWise assets that you want to query data for

    // Refer AWS IoT SiteWise measurements
    const OEE_BAD_COUNT_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';
    const OEE_TOTAL_COUNT_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';
    const CURRENT_SPEED_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';
    const MACHINE_STOP_REASON_CODE_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';

    // Refer IoT SiteWise transforms
    const MACHINE_STATE_ENUM_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';
    const MACHINE_MODE_ENUM_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';
    const STARVED_INDICATOR_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';
    const BLOCKED_INDICATOR_PROPERTY = '<replace-with-corresponding-sitwise-asset-property-id>';
    

    /* --- END: Asset Property Ids from AWS IoT SiteWise*/

    return (
        <Grid gridDefinition={[
            { colspan: { l: 3, m: 3, default: 12 } },
            { colspan: { l: 9, m: 9, default: 12 } }
        ]}>
            <SitwiseResourceExplorer setAssetId={setAssetId} setAssetName={setAssetName}/>
            <Grid gridDefinition={[
                { colspan: { l: 12, m: 12, default: 12 } },
                { colspan: { l: 3, m: 6, default: 12 } },
                { colspan: { l: 3, m: 6, default: 12 } },
                { colspan: { l: 3, m: 6, default: 12 } },
                { colspan: { l: 3, m: 6, default: 12 } },
                { colspan: { l: 3, m: 6, default: 12 } }
            ]}>
                 <MachineMode
                    assetId={assetId}
                    assetName = {assetName}
                    machineModePropertyId={MACHINE_MODE_ENUM_PROPERTY}
                    starvedPropertyId={STARVED_INDICATOR_PROPERTY}
                    blockedPropertyId={BLOCKED_INDICATOR_PROPERTY}
                 />
                <MachineState 
                    assetId={DEFAULT_MACHINE_ASSET_ID}
                    machineStatePropertyId={MACHINE_STATE_ENUM_PROPERTY}
                />
                <MachineSpeed
                    assetId={assetId}
                    machineSpeedPropertyId={CURRENT_SPEED_PROPERTY}
                />
                <ProductionCount 
                    assetId={assetId}
                    badPartsCountPropertyId={OEE_BAD_COUNT_PROPERTY} 
                    totalPartsCountPropertyId={OEE_TOTAL_COUNT_PROPERTY}
                />
                <ProductionStatus
                    assetId={assetId}
                    badPartsCountPropertyId={OEE_BAD_COUNT_PROPERTY}
                    totalPartsCountPropertyId={OEE_TOTAL_COUNT_PROPERTY}
                />
                <StopHistory
                    assetId={assetId}
                    stopReasonPropertyId={MACHINE_STOP_REASON_CODE_PROPERTY}
                />
            </Grid>
        </Grid>
    );
}

function App() {
    return (
        <>
            <TopNavigation 
                identity={{
                    href: "#",
                    title: "AWS IoT App Kit Demo",
                }}
                i18nStrings={{ overflowMenuTriggerText: "More", overflowMenuTitleText: "More" }}
            />
            <AppLayout
                breadcrumbs={<Breadcrumbs/>}
                contentHeader={<PageHeader/>}
                content={<Content/>}
                navigationHide={true}
                toolsHide={true}
            />
            {/* --- BEGIN: `WebglContext` implementation*/}
            <WebglContext/>
            {/* --- END: `WebglContext` implementation*/}
        </>   
    );
}

export default App;