import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ArrowLeft, Calendar, Clock, CheckCircle, Info, ZoomIn } from 'lucide-react';
import { format } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export default function Show({ activity, eventActivity, existingResponse }) {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language === 'en' ? enUS : id;
    // Initialize answers state
    const initialAnswers = {};
    if (!existingResponse) {
        eventActivity.questions.forEach(q => {
            if (q.type === 'checkbox') {
                initialAnswers[q.id] = [];
            } else {
                initialAnswers[q.id] = '';
            }
        });
    }

    const { data, setData, post, processing, errors } = useForm({
        answers: initialAnswers
    });

    const [candidateModal, setCandidateModal] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.event-activities.participate', [activity.id, eventActivity.id]), {
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: t('activities.success'),
                    text: t('activities.reply_sent'),
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: () => {
                Swal.fire({
                    icon: 'error',
                    title: t('activities.error'),
                    text: t('activities.system_error'),
                    confirmButtonColor: '#EF4444'
                });
            }
        });
    };

    const handleAnswerChange = (questionId, value, type) => {
        if (type === 'checkbox') {
            const currentAnswers = [...(data.answers[questionId] || [])];
            if (currentAnswers.includes(value)) {
                setData('answers', {
                    ...data.answers,
                    [questionId]: currentAnswers.filter(v => v !== value)
                });
            } else {
                setData('answers', {
                    ...data.answers,
                    [questionId]: [...currentAnswers, value]
                });
            }
        } else {
            setData('answers', {
                ...data.answers,
                [questionId]: value
            });
        }
    };

    return (
        <MainLayout>
            <Head title={`${eventActivity.title} - ${activity.name}`} />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 px-4 sm:px-0">
                        <Link
                            href={route('activity.event-activities.index', activity.id)}
                            className="text-sm text-primary hover:text-indigo-900 flex items-center mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            {t('activities.back_to_activity_list')}
                        </Link>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{eventActivity.title}</h1>
                                    <p className="text-sm text-gray-500 mt-1 capitalize">{eventActivity.type}</p>
                                </div>
                                <div>
                                    {existingResponse ? (
                                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                                            {t('activities.already_filled')}
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-secondary/10 text-secondary">
                                            {t('activities.not_filled')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {eventActivity.description && (
                                <div className="mt-4 prose text-gray-700 whitespace-pre-wrap">
                                    {eventActivity.description}
                                </div>
                            )}

                            <div className="mt-4 flex space-x-4 text-sm text-gray-500">
                                {eventActivity.start_time && (
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {t('activities.start')}: {format(new Date(eventActivity.start_time), 'd MMM yyyy HH:mm', { locale: currentLocale })}
                                    </div>
                                )}
                                {eventActivity.end_time && (
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {t('activities.end')}: {format(new Date(eventActivity.end_time), 'd MMM yyyy HH:mm', { locale: currentLocale })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6">
                            {existingResponse ? (
                                <div>
                                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <CheckCircle className="h-5 w-5 text-green-400" />
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-green-800">{t('activities.thank_you')}</h3>
                                                <div className="mt-2 text-sm text-green-700">
                                                    <p>{t('activities.completed_activity_msg')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {eventActivity.questions.map((question, index) => {
                                            let answer = existingResponse.answers[question.id] || null;
                                            return (
                                                <div key={question.id} className="bg-gray-50 rounded-lg p-4">
                                                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                                                        {index + 1}. {question.question_text}
                                                    </h4>
                                                    <div className="text-gray-700 font-medium">
                                                        {t('activities.your_answer')}: <span className="text-primary">
                                                            {Array.isArray(answer) ? answer.join(', ') : answer}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="space-y-8">
                                        {eventActivity.questions.map((question, index) => (
                                            <div key={question.id} className="bg-gray-50 rounded-lg p-6">
                                                <label className="block text-lg font-medium text-gray-900 mb-4">
                                                    {index + 1}. {question.question_text}
                                                    {question.is_required && <span className="text-red-500 ml-1">*</span>}
                                                </label>

                                                {/* Rich Options (Voting Candidates) */}
                                                {question.activity_options && question.activity_options.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {question.activity_options.map((option) => (
                                                            <div key={option.id} className="relative group">
                                                                {/* Info Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCandidateModal({
                                                                            title: option.value,
                                                                            description: option.description,
                                                                            image: option.image ? `/storage/${option.image}` : '/assets/images/profilefoto/default-profile.png'
                                                                        });
                                                                    }}
                                                                    className="absolute top-3 left-3 z-20 bg-white/30 hover:bg-white/90 backdrop-blur-md text-white hover:text-primary rounded-full p-2 transition-all duration-300 transform hover:scale-110 shadow-lg"
                                                                    title={t('activities.view_full_detail')}
                                                                >
                                                                    <ZoomIn className="w-5 h-5" />
                                                                </button>

                                                                <label className={`block h-full cursor-pointer relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-2 ${(question.type === 'checkbox'
                                                                    ? (data.answers[question.id] || []).includes(option.value)
                                                                    : data.answers[question.id] === option.value
                                                                ) ? 'border-primary ring-2 ring-indigo-600 ring-opacity-50' : 'border-transparent hover:border-indigo-300'
                                                                    }`}>
                                                                    {/* Image Area */}
                                                                    <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden">
                                                                        <img
                                                                            src={option.image ? `/storage/${option.image}` : '/assets/images/profilefoto/default-profile.png'}
                                                                            alt={option.value}
                                                                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                                                            onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="p-4 absolute bottom-0 left-0 w-full">
                                                                        <div className="flex items-end justify-between">
                                                                            <div className="text-white">
                                                                                <h3 className="text-xl font-bold leading-tight line-clamp-2">{option.value}</h3>
                                                                                <p className="text-indigo-200 text-xs font-medium mt-1">{t('activities.click_to_select')}</p>
                                                                            </div>

                                                                            <div className="bg-white rounded-full p-1 shadow-sm">
                                                                                <input
                                                                                    type={question.type === 'checkbox' ? 'checkbox' : 'radio'}
                                                                                    name={`question_${question.id}`}
                                                                                    value={option.value}
                                                                                    checked={
                                                                                        question.type === 'checkbox'
                                                                                            ? (data.answers[question.id] || []).includes(option.value)
                                                                                            : data.answers[question.id] === option.value
                                                                                    }
                                                                                    onChange={() => handleAnswerChange(question.id, option.value, question.type)}
                                                                                    className={`form-${question.type === 'checkbox' ? 'checkbox' : 'radio'} h-5 w-5 text-primary border-gray-300 focus:ring-indigo-500 cursor-pointer`}
                                                                                    required={question.is_required && question.type !== 'checkbox'}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    // Standard Inputs
                                                    <div>
                                                        {question.type === 'essay' ? (
                                                            <textarea
                                                                value={data.answers[question.id] || ''}
                                                                onChange={e => handleAnswerChange(question.id, e.target.value, 'essay')}
                                                                rows="3"
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                required={question.is_required}
                                                                placeholder={t('activities.write_answer_here')}
                                                            />
                                                        ) : question.type === 'scale' ? (
                                                            <div className="flex items-center space-x-4">
                                                                {[1, 2, 3, 4, 5].map(num => (
                                                                    <label key={num} className="flex flex-col items-center cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`question_${question.id}`}
                                                                            value={num}
                                                                            checked={parseInt(data.answers[question.id]) === num}
                                                                            onChange={() => handleAnswerChange(question.id, num, 'scale')}
                                                                            className="form-radio h-4 w-4 text-primary border-gray-300 focus:ring-indigo-500 mb-1"
                                                                            required={question.is_required}
                                                                        />
                                                                        <span className="text-sm text-gray-700">{num}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            // Multiple Choice (Simple)
                                                            <div className="space-y-2">
                                                                {question.options && (Array.isArray(question.options) ? question.options : question.options.split(',')).map((opt, i) => {
                                                                    const optVal = opt.trim();
                                                                    return (
                                                                        <div key={i} className="flex items-center">
                                                                            <input
                                                                                type="radio"
                                                                                name={`question_${question.id}`}
                                                                                value={optVal}
                                                                                checked={data.answers[question.id] === optVal}
                                                                                onChange={() => handleAnswerChange(question.id, optVal, 'multiple_choice')}
                                                                                className="form-radio h-4 w-4 text-primary border-gray-300 focus:ring-indigo-500"
                                                                                required={question.is_required}
                                                                            />
                                                                            <label className="ml-3 block text-sm font-medium text-gray-700">
                                                                                {optVal}
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8">
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent bg-primary py-3 px-4 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            {processing ? t('activities.sending') : t('activities.send_reply')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Candidate Modal */}
                {candidateModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setCandidateModal(null)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <div className="aspect-w-16 aspect-h-9 mb-4 rounded-lg overflow-hidden bg-gray-100">
                                                <img src={candidateModal.image} alt={candidateModal.title} className="object-cover w-full h-full" />
                                            </div>
                                            <h3 className="text-2xl leading-6 font-bold text-gray-900 mb-2" id="modal-title">
                                                {candidateModal.title}
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                                                    {candidateModal.description || t('activities.no_description')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={() => setCandidateModal(null)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        {t('activities.close')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

