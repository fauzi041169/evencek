import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import DivisionSidebar from './Components/DivisionSidebar';
import RequirementsManager from './Components/RequirementsManager';
import CorePreparationSection from './Components/CorePreparationSection';
import CommitteeSection from './Components/CommitteeSection';
import GallerySection from './Components/GallerySection';
import MaterialsSection from './Components/MaterialsSection';
import RundownSection from './Components/RundownSection';
import SectionContainer from './Components/SectionContainer';
import AddDivisionModal from './Modals/AddDivisionModal';
import AddRequirementModal from './Modals/AddRequirementModal';
import AddOwnerModal from './Modals/AddOwnerModal';

export default function PreparationIndex({
    activity,
    divisions,
    committeeStructure,
    participants,
    rundowns,
    materials,
    owners,
    refPositions,
    participationTypes,
    committeeTypes
}) {
    const { auth } = usePage().props;
    const divisionsList = Array.isArray(divisions) ? divisions : (divisions ? Object.values(divisions) : []);
    const [selectedDivisionId, setSelectedDivisionId] = useState(null);

    useEffect(() => {
        if (divisionsList.length > 0 && !selectedDivisionId) {
            setSelectedDivisionId(divisionsList[0].id);
        }
    }, [divisionsList]);

    const handleDivisionSelect = (id) => {
        setSelectedDivisionId(id);
    };

    return (
        <AcaraLayout
            title={`Persiapan - ${activity.name}`}
            activity={activity}
        >
            <div className="min-h-screen bg-[#fafbfc] py-10 font-primary">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* modern header */}
                    {/* Modern Premium Header */}
                    <div className="mb-12 relative">
                        {/* Decorative background blob */}
                        <div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                        <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

                        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-bold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                    <span>Preparation Hub</span>
                                </div>
                                <div>
                                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 tracking-tight leading-tight">
                                        Manajemen Persiapan
                                    </h1>
                                    <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                                </div>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    Pusat kontrol untuk melengkapi dan memonitor segala kebutuhan acara <span className="font-bold text-slate-900">{activity.name}</span>. Pastikan semua persiapan matang sebelum hari H.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* combined panels: owners and participation types */}
                    <CorePreparationSection
                        owners={owners}
                        participationTypes={participationTypes}
                        committeeTypes={committeeTypes}
                        activity={activity}
                    />

                    {/* main content sections */}
                    <div className="space-y-10">
                        {/* Committee */}
                        <CommitteeSection
                            activity={activity}
                            committeeStructure={committeeStructure}
                            refPositions={refPositions}
                            divisions={divisionsList}
                            participants={participants}
                        />

                        {/* Rundown */}
                        <SectionContainer title="Rundown Acara" activity={activity}>
                            <RundownSection activity={activity} rundowns={rundowns} />
                        </SectionContainer>

                        {/* Materials */}
                        <SectionContainer title="Materi & Dokumen" activity={activity}>
                            <MaterialsSection activity={activity} materials={materials} />
                        </SectionContainer>
                    </div>

                    {/* Requirements section - wider at bottom */}
                    <div className="mt-10 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Kebutuhan Per Divisi</h3>
                                <p className="text-sm text-gray-500 font-medium italic mt-1">Monitor kesiapan operasional setiap tim</p>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 min-h-[600px]">
                            <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-50/20">
                                <DivisionSidebar
                                    divisions={divisionsList}
                                    selectedDivisionId={selectedDivisionId}
                                    onSelect={handleDivisionSelect}
                                />
                            </div>
                            <div className="flex-1 bg-white">
                                {selectedDivisionId ? (
                                    <div className="p-8 animate-in fade-in duration-300">
                                        <RequirementsManager
                                            divisionId={selectedDivisionId}
                                            divisions={divisionsList}
                                            activity={activity}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                                        <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                                            <i className="fas fa-layer-group text-5xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">Pilih Divisi</h4>
                                        <p className="text-gray-400 max-w-xs mx-auto font-medium">Silakan pilih divisi di menu samping untuk mulai mengelola daftar kebutuhan mereka.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Gallery Section - Moved to bottom */}
                    <div className="mt-10">
                        <SectionContainer title="Galeri & Materi" activity={activity}>
                            <GallerySection activity={activity} materials={materials} />
                        </SectionContainer>
                    </div>
                </div>
            </div>

            <AddDivisionModal activity={activity} />
            <AddRequirementModal activity={activity} />
            <AddOwnerModal activity={activity} />
        </AcaraLayout>
    );
}
