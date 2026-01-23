import React from 'react';
import { Link } from '@inertiajs/react';

export default function Pagination({ 
    links = [],
    currentPage = 1,
    lastPage = 1,
    from = 0,
    to = 0,
    total = 0,
    prevPageUrl = null,
    nextPageUrl = null,
    onPageChange = null // For client-side pagination
}) {
    // If no links provided, generate from currentPage and lastPage
    const paginationLinks = links.length > 0 ? links : generateLinks(currentPage, lastPage);

    function generateLinks(current, last) {
        const items = [];
        
        // Previous
        items.push({
            url: current > 1 ? `?page=${current - 1}` : null,
            label: '&laquo;',
            active: false
        });

        // Page numbers
        for (let i = 1; i <= last; i++) {
            if (
                i === 1 || 
                i === last || 
                (i >= current - 2 && i <= current + 2)
            ) {
                items.push({
                    url: `?page=${i}`,
                    label: String(i),
                    active: i === current
                });
            } else if (
                i === current - 3 || 
                i === current + 3
            ) {
                items.push({
                    url: null,
                    label: '...',
                    active: false
                });
            }
        }

        // Next
        items.push({
            url: current < last ? `?page=${current + 1}` : null,
            label: '&raquo;',
            active: false
        });

        return items;
    }

    const handleClick = (e, url, page) => {
        if (onPageChange) {
            e.preventDefault();
            onPageChange(page);
        }
    };

    if (lastPage <= 1) {
        return null;
    }

    return (
        <nav role="navigation" aria-label="Pagination Navigation" className="flex items-center justify-center">
            {/* Mobile View - Compact */}
            <div className="flex justify-center items-center gap-2 sm:hidden">
                {currentPage === 1 ? (
                    <span className="relative inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-400 bg-white border border-gray-300 cursor-default rounded-lg">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </span>
                ) : (
                    <Link
                        href={prevPageUrl || `?page=${currentPage - 1}`}
                        onClick={(e) => handleClick(e, prevPageUrl, currentPage - 1)}
                        className="relative inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-700 bg-white border-2 border-primary/30 rounded-lg hover:bg-primary/10 hover:border-primary/50 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition ease-in-out duration-150"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </Link>
                )}

                <span className="text-xs sm:text-sm text-gray-600 font-medium px-2">
                    {currentPage} / {lastPage}
                </span>

                {currentPage < lastPage ? (
                    <Link
                        href={nextPageUrl || `?page=${currentPage + 1}`}
                        onClick={(e) => handleClick(e, nextPageUrl, currentPage + 1)}
                        className="relative inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-700 bg-white border-2 border-primary/30 rounded-lg hover:bg-primary/10 hover:border-primary/50 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition ease-in-out duration-150"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </Link>
                ) : (
                    <span className="relative inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-400 bg-white border border-gray-300 cursor-default rounded-lg">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </span>
                )}
            </div>

            {/* Desktop View - Full Pagination */}
            <div className="hidden sm:flex sm:items-center sm:justify-center">
                <div className="flex items-center gap-1">
                    {paginationLinks.map((link, index) => {
                        const isFirst = index === 0;
                        const isLast = index === paginationLinks.length - 1;
                        const isPrevNext = isFirst || isLast;
                        const isDots = link.label === '...';
                        const pageNum = parseInt(link.label);

                        if (isDots) {
                            return (
                                <span key={index} aria-disabled="true">
                                    <span className="relative inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-secondary bg-secondary/5 border-2 border-secondary/30 cursor-default rounded-lg">
                                        ...
                                    </span>
                                </span>
                            );
                        }

                        if (!link.url) {
                            return (
                                <span key={index} aria-disabled="true">
                                    <span 
                                        className="relative inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-gray-400 bg-white border border-gray-300 cursor-default rounded-lg"
                                        aria-hidden="true"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                </span>
                            );
                        }

                        if (link.active) {
                            return (
                                <span key={index} aria-current="page">
                                    <span className="relative inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-white bg-gradient-to-br from-primary to-secondary border-2 border-secondary cursor-default rounded-lg shadow-lg">
                                        {link.label}
                                    </span>
                                </span>
                            );
                        }

                        return (
                            <Link
                                key={index}
                                href={link.url}
                                onClick={(e) => handleClick(e, link.url, isNaN(pageNum) ? (isFirst ? currentPage - 1 : currentPage + 1) : pageNum)}
                                className="relative inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-gray-700 bg-white border-2 border-primary/30 rounded-lg hover:bg-gradient-to-br hover:from-primary/10 hover:to-secondary/10 hover:border-secondary/50 hover:text-secondary focus:z-10 focus:outline-none focus:ring-2 focus:ring-secondary transition ease-in-out duration-150"
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
