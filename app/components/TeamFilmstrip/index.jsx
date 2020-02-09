import React from "react"
import styled from "styled-components"
import theme from "../_theme"

import t1 from "./1.jpg"
import t2 from "./2.jpg"
import t3 from "./3.jpg"
import t4 from "./4.jpg"
import t5 from "./5.jpg"

const Outer = styled.nav`
    max-width: ${theme.maxWidth};
    padding: 30px 20px;
    display: grid;
    grid-row-gap: 20px;
    @media screen and (min-width: 300px){
        grid-template-columns: 1fr 1fr;
        grid-column-gap: 20px;
    }
    @media screen and (min-width: 500px){
        grid-template-columns: 1fr 1fr 1fr;
    }
    /* @media screen and (min-width: 700px){
        grid-template-columns: 1fr 1fr 1fr 1fr;
    }
    @media screen and (min-width: 900px){
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
        grid-column-gap: 40px;
    } */
`

const Tile = styled.a`
    text-align: center;
    /* box-shadow: 0px 3px 40px #D6CEE8; */
    border-radius: 5px;
    text-decoration: none;
    background: ${theme.purple};
    position: relative;
    min-height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px;
    transition: box-shadow 0.2s ease-out, transform 0.2s ease-out;
    @media screen and (min-width: 700px){
        min-height: 130px;
    }
    &:focus{
        outline: none;
        background: ${theme.yellow};
    }
    &:hover{
        box-shadow: 0px 6px 7px rgba(39, 34, 68, 0.2);
        transform: translateY(-5px);
        .explore-by-team__image{
            filter: brightness(0.75)
        }
    }
`

const Image = styled.img`
    position: absolute;
    left: 0px;
    top: 0px;
    height: 100%;
    width: 100%;
    border-radius: 5px;
    opacity: 0.8;
    object-fit: cover;
    filter: brightness(0.5);
    transition: 0.2s ease-out;
`

const Name = styled.p`
    margin-top: 0px;
    font-size: 1.1rem;
    margin-bottom: 0px;
    font-weight: bold;
    color: white;
    position: relative;
    @media screen and (min-width: 800px){
        font-size: 1.2rem;
    }
`

const TeamFilmstrip = () =>
    <Outer>
        <Tile href="#service design">
            <Image src={t1} alt=""/>
            <Name>Service design</Name>
        </Tile>
        <Tile href="#product design">
            <Image src={t2} alt=""/>
            <Name>Product design</Name>
        </Tile>
        <Tile href="#delivery management">
            <Image src={t3} alt=""/>
            <Name>Delivery management</Name>
        </Tile>
        <Tile href="#design research">
            <Image src={t4} alt=""/>
            <Name>Design research</Name>
        </Tile>
        <Tile href="#consultancy and organisation design">
            <Image src={t5} alt=""/>
            <Name>Consultancy and organisation design</Name>
        </Tile>
    </Outer>

export default TeamFilmstrip